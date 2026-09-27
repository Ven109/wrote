import type { ContextItem, ContextKind, ContextLayer } from '#shared/schemas/context'
import { BOOK_LAYOUT } from '#shared/book/layout'
import { BOOK_SUMMARY_ID } from '#shared/schemas/summaries'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { listSummaries } from '../../db/state/summaries'
import { mentionTargets } from '../../services/mentions'
import { searchBook } from '../../services/search'
import { getStructure, type StructureNode } from '../../services/structure'
import type { BookContext } from '../../services/workspace'
import type { StoredEntry } from '../../storage/entries'
import { estimateTokens } from './tokens'

const MAX_PINNED_CHARS = 6000
const MAX_RETRIEVED_CHARS = 1500
const MAX_CODEX = 6
const MAX_SEARCH = 5

/** Cuts text to `max` characters at a word boundary. */
export function clip(text: string, max: number): string {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  const cut = trimmed.slice(0, max)
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max * 0.8)).trimEnd()} […]`
}

/** The part of a long text around `focus` (e.g. the selection), `max` characters wide. */
export function windowAround(text: string, focus: string | undefined, max: number): string {
  if (text.length <= max) return text.trim()
  const at = focus ? text.indexOf(focus.slice(0, 200)) : -1
  if (at < 0) return clip(text, max)
  const start = Math.max(0, Math.min(at - Math.floor(max / 3), text.length - max))
  return `${start > 0 ? '[…] ' : ''}${text.slice(start, start + max).trim()}${start + max < text.length ? ' […]' : ''}`
}

export function makeItem(layer: ContextLayer, kind: ContextKind, id: string, title: string, text: string, entry?: StoredEntry | null): ContextItem {
  const source = entry ? { entryId: entry.frontmatter.id, path: entry.path, type: entry.type } : null
  return { id, layer, kind, title, source, text, tokens: estimateTokens(text), pinned: false }
}

export async function pinnedLayer(book: BookContext, entry: StoredEntry | null, pins: string[]): Promise<ContextItem[]> {
  const items: ContextItem[] = []
  const styleGuide = await book.repository.read(BOOK_LAYOUT.styleGuide).catch(() => null)
  if (styleGuide?.body.trim()) items.push(makeItem('pinned', 'style-guide', 'style-guide', 'Style guide', clip(styleGuide.body, MAX_PINNED_CHARS), styleGuide))
  const synopsis = entry && 'synopsis' in entry.frontmatter ? String(entry.frontmatter.synopsis ?? '').trim() : ''
  if (entry && synopsis) items.push(makeItem('pinned', 'synopsis', `synopsis:${entry.frontmatter.id}`, `Synopsis of “${entry.frontmatter.title}”`, synopsis, entry))
  // Author pins of entries (e.g. a search hit from an earlier answer) that no other layer provides.
  for (const pin of pins) {
    const entryId = pin.split(':')[1]
    const pinned = entryId && /^[a-z]{3}_/.test(entryId) ? await readById(book, entryId) : null
    if (pinned) items.push({ ...makeItem('pinned', 'pin', pin, pinned.frontmatter.title, clip(pinned.body, MAX_PINNED_CHARS), pinned), pinned: true })
  }
  return items
}

export function localLayer(entry: StoredEntry | null, selection: string | undefined, maxChars: number): ContextItem[] {
  const items: ContextItem[] = []
  if (selection?.trim()) items.push(makeItem('local', 'selection', 'selection', 'Selected text', selection.trim(), entry))
  if (entry?.body.trim()) {
    const text = windowAround(entry.body, selection, maxChars)
    items.push(makeItem('local', 'entry', `entry:${entry.frontmatter.id}`, `${entry.type[0]!.toUpperCase()}${entry.type.slice(1)} “${entry.frontmatter.title}” (open)`, text, entry))
  }
  return items
}

async function readById(book: BookContext, id: string): Promise<StoredEntry | null> {
  const row = (await book.db.$client.execute({ sql: 'SELECT path FROM entries WHERE id = ?', args: [id] })).rows[0]
  return row ? book.repository.read(String(row.path)).catch(() => null) : null
}

/** Codex entries named (by title or alias) in the working text or the request, then search hits for the request. */
export async function retrievedLayer(book: BookContext, entry: StoredEntry | null, text: string, query: string): Promise<ContextItem[]> {
  const exclude = new Set(entry ? [entry.frontmatter.id] : [])
  const targets = await mentionTargets(book)
  const matcher = createNameMatcher(targets.flatMap(target => target.names.map(name => ({ name, entryId: target.id }))))
  const mentioned = [...new Set(matcher.find(`${query}\n${text}`).map(match => match.entryId))].filter(id => !exclude.has(id)).slice(0, MAX_CODEX)
  const items: ContextItem[] = []
  for (const id of mentioned) {
    const codex = await readById(book, id)
    if (!codex) continue
    exclude.add(id)
    items.push(makeItem('retrieved', 'codex', `codex:${id}`, `Codex: ${codex.frontmatter.title}`, clip(codex.body, MAX_RETRIEVED_CHARS), codex))
  }
  if (!query.trim()) return items
  const hits = (await searchBook(book, query, { limit: MAX_SEARCH * 2, anyTerm: true })).filter(hit => !exclude.has(hit.id)).slice(0, MAX_SEARCH)
  for (const hit of hits) {
    const found = await book.repository.read(hit.path).catch(() => null)
    if (found?.body.trim()) items.push(makeItem('retrieved', 'search', `search:${hit.id}`, `Search: ${hit.title}`, clip(found.body, MAX_RETRIEVED_CHARS), found))
  }
  return items
}

function neighbours(tree: StructureNode[], entryId: string): { parents: StructureNode[], siblings: StructureNode[] } {
  const walk = (nodes: StructureNode[], path: StructureNode[]): { parents: StructureNode[], siblings: StructureNode[] } | null => {
    const index = nodes.findIndex(node => node.id === entryId)
    if (index >= 0) return { parents: path, siblings: [nodes[index - 1], nodes[index + 1]].filter((node): node is StructureNode => Boolean(node)) }
    for (const node of nodes) {
      const found = walk(node.children, [node, ...path])
      if (found) return found
    }
    return null
  }
  return walk(tree, []) ?? { parents: [], siblings: [] }
}

/** The book summary, then summaries of the open entry's chapter/part and its neighbouring entries. */
export async function summaryLayer(book: BookContext, entry: StoredEntry | null): Promise<ContextItem[]> {
  const summaries = new Map((await listSummaries(book.state)).map(summary => [summary.entryId, summary.text]))
  const items: ContextItem[] = []
  const bookSummary = summaries.get(BOOK_SUMMARY_ID)
  if (bookSummary) items.push(makeItem('summary', 'summary', `summary:${BOOK_SUMMARY_ID}`, 'Summary of the book so far', bookSummary))
  if (!entry) return items
  const { parents, siblings } = neighbours(await getStructure(book.db), entry.frontmatter.id)
  for (const node of [...parents, ...siblings]) {
    const text = summaries.get(node.id)
    if (text) items.push(makeItem('summary', 'summary', `summary:${node.id}`, `Summary of ${node.type} “${node.title}”`, text))
  }
  return items
}
