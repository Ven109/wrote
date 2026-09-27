import { defineQueryOptions } from '@pinia/colada'
import type { BookSummary } from '#shared/schemas/library'
import { bookKeys } from './keys'

export const booksQuery = defineQueryOptions({
  key: bookKeys.list(),
  query: () => $fetch<BookSummary[]>('/api/books'),
})

export const bookSummaryQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.summary(bookId),
  query: () => $fetch<BookSummary>(`/api/books/${encodeURIComponent(bookId)}`),
}))
