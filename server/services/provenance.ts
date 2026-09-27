import type { EntryProvenance, ProvenanceRange, ProvenanceStats, ResolvedProvenance } from '#shared/schemas/provenance'
import { createRecordId } from '#shared/utils/ids'
import { anchorContext, locateAnchor } from '#shared/utils/text-anchor'
import { countWords } from '#shared/utils/word-count'
import { wordChangeRatio } from '#shared/utils/word-diff'
import { listProvenanceEntryIds, readProvenanceFile, writeProvenanceFile } from '../storage/provenance'
import { getEntry } from './entries'
import { getStructure, type StructureNode } from './structure'
import type { BookContext } from './workspace'

/** Default share of a passage the author must rewrite before it no longer counts as AI-assisted. */
export const DEFAULT_REWRITE_THRESHOLD = 0.5
const CONTEXT_PROBE = 24

export const statsOf = (aiWords: number, totalWords: number): ProvenanceStats =>
  ({ aiWords, totalWords, share: totalWords ? Math.min(1, aiWords / totalWords) : 0 })

/**
 * Where a provenance range is in `body` now: the accepted text itself, or – after the author edited it – the
 * passage between its surroundings, as long as less than `threshold` of the accepted words were rewritten.
 * `null` when the passage is gone or rewritten beyond the threshold.
 */
export function locateProvenance(body: string, range: Pick<ProvenanceRange, 'text' | 'before' | 'after'>, threshold = DEFAULT_REWRITE_THRESHOLD): { from: number, to: number, changed: number } | null {
  const exact = locateAnchor(body, range.text, range)
  if (exact) return { ...exact, changed: 0 }
  const head = range.before.slice(-CONTEXT_PROBE)
  const tail = range.after.slice(0, CONTEXT_PROBE)
  if (!head && !tail) return null
  const headAt = head ? body.indexOf(head) : 0
  if (headAt < 0) return null
  const from = headAt + head.length
  const to = tail ? body.indexOf(tail, from) : body.length
  if (to < from || to - from > range.text.length * 3 + 200) return null
  const changed = wordChangeRatio(range.text, body.slice(from, to))
  return changed < threshold ? { from, to, changed } : null
}

export interface AcceptedText {
  entryId: string
  text: string
  before: string
  after: string
  author: ProvenanceRange['author']
  model: string | null
  suggestionId: string
}

/** Records accepted AI text in the entry's sidecar (`.wrote/provenance/`), outside the prose. */
export async function recordProvenance(book: BookContext, accepted: AcceptedText, now = new Date()): Promise<void> {
  if (!accepted.text.trim()) return
  const file = await readProvenanceFile(book.root, accepted.entryId)
  const { entryId: _entryId, ...range } = accepted
  file.ranges.push({ ...range, id: createRecordId('prv', 10), acceptedAt: now.toISOString() })
  await writeProvenanceFile(book.root, file)
}

/**
 * The AI-assisted passages of an entry as they are now. Ranges follow edits (their surroundings are refreshed
 * and saved); ranges whose text is gone or was rewritten past the threshold are dropped for good.
 */
export async function entryProvenance(book: BookContext, entryId: string, threshold = DEFAULT_REWRITE_THRESHOLD): Promise<EntryProvenance> {
  const [file, entry] = await Promise.all([readProvenanceFile(book.root, entryId), getEntry(book.db, book.repository, { id: entryId })])
  const body = entry.body
  const kept: ProvenanceRange[] = []
  const ranges: ResolvedProvenance[] = []
  for (const range of file.ranges) {
    const found = locateProvenance(body, range, threshold)
    if (!found) continue
    const context = anchorContext(body, found)
    kept.push({ ...range, ...context })
    const text = body.slice(found.from, found.to)
    ranges.push({ ...range, ...context, text, changed: found.changed, words: countWords(text) })
  }
  if (JSON.stringify(kept) !== JSON.stringify(file.ranges)) await writeProvenanceFile(book.root, { ...file, ranges: kept })
  return { entryId, ranges, stats: statsOf(ranges.reduce((sum, range) => sum + range.words, 0), countWords(body)) }
}

/** AI-assisted share per entry (scenes, rolled up to chapters and parts) and for the whole manuscript. */
export async function provenanceStats(book: BookContext, threshold = DEFAULT_REWRITE_THRESHOLD): Promise<{ book: ProvenanceStats, entries: Record<string, ProvenanceStats> }> {
  const withProvenance = new Set(await listProvenanceEntryIds(book.root))
  const entries: Record<string, ProvenanceStats> = {}
  async function visit(node: StructureNode): Promise<ProvenanceStats> {
    if (node.type === 'scene') {
      const stats = withProvenance.has(node.id) ? (await entryProvenance(book, node.id, threshold).catch(() => null))?.stats : null
      return (entries[node.id] = stats ?? statsOf(0, node.wordCount))
    }
    const children = await Promise.all(node.children.map(visit))
    return (entries[node.id] = statsOf(children.reduce((sum, s) => sum + s.aiWords, 0), children.reduce((sum, s) => sum + s.totalWords, 0)))
  }
  const parts = await Promise.all((await getStructure(book.db)).map(visit))
  return { book: statsOf(parts.reduce((sum, s) => sum + s.aiWords, 0), parts.reduce((sum, s) => sum + s.totalWords, 0)), entries }
}
