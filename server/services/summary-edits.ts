import { BOOK_SUMMARY_ID, type Summary, type SummaryScope } from '#shared/schemas/summaries'
import { deleteSummary, getSummary, listSummaries, saveManualSummary, type StoredSummary } from '../db/state/summaries'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import { getStructure, type StructureNode } from './structure'
import { scheduleSummaries } from './summary-jobs'
import type { BookContext } from './workspace'

const toView = ({ sourceText: _text, sourceHash: _hash, ...summary }: StoredSummary): Summary => summary

async function scopeOf(book: BookContext, entryId: string): Promise<SummaryScope> {
  if (entryId === BOOK_SUMMARY_ID) return 'book'
  const result = await book.db.$client.execute({ sql: 'SELECT type FROM entries WHERE id = ?', args: [entryId] })
  const type = result.rows[0]?.type
  if (type === undefined) throw new NotFoundError(`Entry ${entryId}`)
  if (type !== 'scene' && type !== 'chapter' && type !== 'part') throw new InvalidInputError(`A ${String(type)} has no summary`)
  return type
}

export async function readSummary(book: BookContext, entryId: string): Promise<Summary | null> {
  const summary = await getSummary(book.state, entryId)
  return summary && toView(summary)
}

export async function readSummaries(book: BookContext): Promise<Summary[]> {
  return (await listSummaries(book.state)).map(toView)
}

/** The author's own summary: stored as manual, so background jobs never overwrite it. Containers above refresh. */
export async function writeManualSummary(book: BookContext, entryId: string, text: string, now = new Date()): Promise<Summary> {
  const summary = await saveManualSummary(book.state, { entryId, scope: await scopeOf(book, entryId), text }, now)
  await scheduleSummaries(book)
  return toView(summary)
}

/** Drops the summary (and its manual lock); the next background run writes a fresh one. */
export async function resetSummary(book: BookContext, entryId: string): Promise<void> {
  await scopeOf(book, entryId)
  await deleteSummary(book.state, entryId)
  await scheduleSummaries(book, { delayMs: 0 })
}

export interface OutlineNode {
  id: string
  type: 'part' | 'chapter' | 'scene'
  title: string
  summary: string | null
  children?: OutlineNode[]
}

/** The book as a tree of summaries (scenes optional) – an overview for the assistant without reading every scene. */
export async function summaryOutline(book: BookContext, options: { includeScenes: boolean }): Promise<{ book: string | null, outline: OutlineNode[] }> {
  const summaries = new Map((await listSummaries(book.state)).map(summary => [summary.entryId, summary.text]))
  const toNode = (node: StructureNode): OutlineNode | null => {
    if (node.type === 'scene' && !options.includeScenes) return null
    const children = node.children.map(toNode).filter((child): child is OutlineNode => child !== null)
    return { id: node.id, type: node.type, title: node.title, summary: summaries.get(node.id) ?? null, ...(children.length ? { children } : {}) }
  }
  const outline = (await getStructure(book.db)).map(toNode).filter((node): node is OutlineNode => node !== null)
  return { book: summaries.get(BOOK_SUMMARY_ID) ?? null, outline }
}
