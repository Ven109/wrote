import { defineQueryOptions } from '@pinia/colada'
import type { BookSearchHit } from '#shared/schemas/search'
import { bookKeys } from './keys'

/** Hybrid (words + meaning) search in one book. */
export const bookSearchQuery = defineQueryOptions(({ bookId, q }: { bookId: string, q: string }) => ({
  key: bookKeys.search(bookId, q),
  query: ({ signal }) => $fetch<BookSearchHit[]>(`/api/books/${bookId}/search`, { query: { q, limit: 8 }, signal }),
  enabled: Boolean(bookId) && q.length >= 2,
  staleTime: 10_000,
}))
