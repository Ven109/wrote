import type { EntryType } from './entry'

/** How a search hit was found: by its words (full-text), by meaning (embeddings) or both. */
export type MatchKind = 'text' | 'meaning' | 'both'

/** A hybrid search result (`GET /api/books/:bookId/search`, `search` tool). */
export interface BookSearchHit {
  id: string
  path: string
  type: EntryType
  title: string
  /** Word matches wrapped in `<mark>` (full-text), or a plain excerpt of the closest passage (meaning). */
  snippet: string
  /** Reciprocal-rank-fusion score – higher is better. */
  score: number
  match: MatchKind
}
