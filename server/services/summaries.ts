import { createHash } from 'node:crypto'
import { BOOK_SUMMARY_ID, type SummaryScope } from '#shared/schemas/summaries'
import { isSignificantChange } from '#shared/utils/text-change'
import { rollupPrompt, scenePrompt, type SummaryPrompt } from '../ai/summary-prompts'
import { listSummaries, pruneSummaries, recordUsage, saveGeneratedSummary, usageToday, type StoredSummary } from '../db/state/summaries'
import { readBookConfig } from '../storage/config'
import { getStructure, type StructureNode } from './structure'
import type { BookContext } from './workspace'

export const SUMMARY_FEATURE = 'summaries'

/** Generates text for a prompt and reports the tokens spent. Injected so tests need no provider. */
export type GenerateSummary = (prompt: SummaryPrompt, signal: AbortSignal) => Promise<{ text: string, tokens: number }>

export interface RefreshOptions {
  generate: GenerateSummary
  /** `provider:model`, stored with each summary. */
  model: string
  /** Tokens per UTC day for summaries; work stops (and resumes tomorrow or on the next change) once reached. */
  dailyTokenBudget: number
  signal: AbortSignal
  progress?: (value: number, message: string) => Promise<void>
  now?: () => Date
}

export interface RefreshResult {
  scenes: number
  rollups: number
  tokens: number
  stoppedByBudget: boolean
}

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex')

function flatten(nodes: StructureNode[]): StructureNode[] {
  return nodes.flatMap(node => [node, ...flatten(node.children)])
}

/** Scenes whose summary is missing or out of date after a significant edit (manual summaries are left alone). */
async function staleScenes(book: BookContext, scenes: StructureNode[], existing: Map<string, StoredSummary>) {
  const stale: { node: StructureNode, body: string }[] = []
  for (const node of scenes) {
    const summary = existing.get(node.id)
    if (summary?.isManual) continue
    const body = (await book.repository.read(node.path).catch(() => null))?.body.trim()
    if (!body) continue
    if (summary?.sourceText && !isSignificantChange(summary.sourceText, body)) continue
    stale.push({ node, body })
  }
  return stale
}

/**
 * Brings the book's summaries up to date: scenes with significant changes first, then chapters, parts
 * and the book, each rolled up from its children when their summaries changed. Cheap when nothing
 * changed; bounded by the daily token budget.
 */
export async function refreshSummaries(book: BookContext, options: RefreshOptions): Promise<RefreshResult> {
  const now = options.now ?? (() => new Date())
  const tree = await getStructure(book.db)
  const nodes = flatten(tree)
  await pruneSummaries(book.state, [...nodes.map(node => node.id), BOOK_SUMMARY_ID])
  const existing = new Map((await listSummaries(book.state)).map(summary => [summary.entryId, summary]))
  const stale = await staleScenes(book, nodes.filter(node => node.type === 'scene'), existing)
  const result: RefreshResult = { scenes: 0, rollups: 0, tokens: 0, stoppedByBudget: false }
  let steps = 0
  const totalSteps = stale.length + nodes.filter(node => node.type !== 'scene').length + 1

  async function write(entryId: string, scope: SummaryScope, prompt: SummaryPrompt, source: { text: string | null, hash: string }): Promise<boolean> {
    options.signal.throwIfAborted()
    if (await usageToday(book.state, SUMMARY_FEATURE, now()) >= options.dailyTokenBudget) {
      result.stoppedByBudget = true
      return false
    }
    await options.progress?.(Math.min(steps++ / totalSteps, 0.99), `Summarizing (${result.scenes + result.rollups} done)`)
    const { text, tokens } = await options.generate(prompt, options.signal)
    await recordUsage(book.state, SUMMARY_FEATURE, tokens, now())
    result.tokens += tokens
    const saved = await saveGeneratedSummary(book.state, { entryId, scope, text: text.trim(), sourceText: source.text, sourceHash: source.hash, model: options.model }, now())
    if (saved) existing.set(entryId, { entryId, scope, text: text.trim(), isManual: false, model: options.model, updatedAt: now().toISOString(), sourceText: source.text, sourceHash: source.hash })
    return true
  }

  for (const { node, body } of stale) {
    if (!await write(node.id, 'scene', scenePrompt(node.title, body), { text: body, hash: sha1(body) })) return result
    result.scenes++
  }

  async function rollup(entryId: string, scope: Exclude<SummaryScope, 'scene'>, title: string, children: StructureNode[]): Promise<boolean> {
    const parts = children.map(child => ({ title: child.title, text: existing.get(child.id)?.text })).filter((part): part is { title: string, text: string } => Boolean(part.text))
    const current = existing.get(entryId)
    if (!parts.length || current?.isManual) return true
    const hash = sha1(JSON.stringify(parts))
    if (current?.sourceHash === hash) return true
    if (!await write(entryId, scope, rollupPrompt(scope, title, parts), { text: null, hash })) return false
    result.rollups++
    return true
  }

  // Post-order: children before their container, so changes cascade up to the book in one run.
  async function visit(node: StructureNode): Promise<boolean> {
    if (node.type === 'scene') return true
    for (const child of node.children) if (!await visit(child)) return false
    return rollup(node.id, node.type === 'part' ? 'part' : 'chapter', node.title, node.children)
  }
  for (const root of tree) if (!await visit(root)) return result
  const { title } = await readBookConfig(book.root)
  await rollup(BOOK_SUMMARY_ID, 'book', title, tree)
  await options.progress?.(1, `${result.scenes + result.rollups} summaries updated`)
  return result
}
