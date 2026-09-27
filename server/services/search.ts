import type { SearchOptions } from '../db/queries'
import { hybridSearch, type HybridHit } from '../search/hybrid'
import { embedQuery } from './embeddings'
import type { BookContext } from './workspace'

export interface BookSearchOptions extends SearchOptions {
  /** Also search by meaning when an embedding model is set up (default true). */
  semantic?: boolean
}

/** Searches a book by words and – when semantic search is available – by meaning, fused into one ranking. */
export async function searchBook(book: BookContext, text: string, options: BookSearchOptions = {}): Promise<HybridHit[]> {
  const { semantic = true, ...filters } = options
  const vector = semantic ? await embedQuery(book, text) : null
  return hybridSearch(book.db, text, vector, filters)
}
