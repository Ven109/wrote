import type { BookSearchHit } from '#shared/schemas/search'
import type { SearchOptions } from '../db/queries'
import { searchEntries } from '../db/queries'
import type { IndexDb } from '../db/client'
import { nearestChunks, type ChunkHit } from '../db/vectors'

export type HybridHit = BookSearchHit

/** Standard RRF damping constant: ranks below ~60 contribute little. */
export const RRF_K = 60
const CANDIDATES = 50
const SNIPPET_CHARS = 180

/** Fuses ranked id lists: score(id) = Σ 1 / (k + rank). Ties keep first-seen order. */
export function reciprocalRankFusion(lists: string[][], k = RRF_K): Map<string, number> {
  const scores = new Map<string, number>()
  for (const list of lists) {
    list.forEach((id, rank) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1)))
  }
  return new Map([...scores].sort((a, b) => b[1] - a[1]))
}

/** Plain-text excerpt of a chunk (without its title line) for meaning-only hits. */
export function chunkSnippet(text: string): string {
  const body = text.includes('\n\n') ? text.slice(text.indexOf('\n\n') + 2) : text
  const flat = body.replace(/\s+/g, ' ').trim()
  return flat.length > SNIPPET_CHARS ? `${flat.slice(0, SNIPPET_CHARS).trimEnd()}…` : flat
}

/** Best (closest) chunk per entry, in rank order. */
function bestChunkPerEntry(chunks: ChunkHit[]): ChunkHit[] {
  const seen = new Map<string, ChunkHit>()
  for (const chunk of chunks) if (!seen.has(chunk.id)) seen.set(chunk.id, chunk)
  return [...seen.values()]
}

/**
 * Hybrid search: BM25 full-text hits and vector-nearest chunks (grouped per entry) fused with
 * reciprocal rank fusion. Without a query vector it is plain full-text search.
 */
export async function hybridSearch(db: IndexDb, text: string, queryVector: number[] | null, options: SearchOptions = {}): Promise<HybridHit[]> {
  const limit = options.limit ?? 20
  const textHits = await searchEntries(db, text, { ...options, limit: CANDIDATES })
  // Nearest neighbours always exist, relevant or not: only the closest `limit` entries take part.
  const meaningHits = queryVector ? bestChunkPerEntry(await nearestChunks(db, queryVector, { ...options, limit: CANDIDATES * 3 })).slice(0, limit) : []
  const fused = reciprocalRankFusion([textHits.map(hit => hit.id), meaningHits.map(hit => hit.id)])
  const byText = new Map(textHits.map(hit => [hit.id, hit]))
  const byMeaning = new Map(meaningHits.map(hit => [hit.id, hit]))
  return [...fused].slice(0, limit).map(([id, score]) => {
    const textHit = byText.get(id)
    const meaningHit = byMeaning.get(id)
    const base = textHit ?? meaningHit!
    return {
      id,
      path: base.path,
      type: base.type,
      title: base.title,
      snippet: textHit?.snippet ?? chunkSnippet(meaningHit!.text),
      score,
      match: textHit && meaningHit ? 'both' : textHit ? 'text' : 'meaning',
    }
  })
}
