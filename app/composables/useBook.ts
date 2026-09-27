import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { BookSummary, UpdateBookInput } from '#shared/schemas/library'
import { bookSummaryQuery } from '~/queries/books'
import { bookKeys } from '~/queries/keys'

/** One book's summary and settings. */
export function useBook(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const { data: book, status, error, refresh } = useQuery(() => bookSummaryQuery(toValue(bookId)))

  const { mutateAsync: update } = useMutation({
    mutation: (changes: UpdateBookInput) =>
      $fetch<BookSummary>(`/api/books/${encodeURIComponent(toValue(bookId))}`, { method: 'PATCH', body: changes }),
    onSuccess(updated) {
      queryCache.setQueryData(bookKeys.summary(toValue(bookId)), updated)
    },
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.list() }),
  })

  return { book, status, error, refresh, update }
}

/** The book id from the current route (`/books/:book/...`). */
export function useRouteBookId() {
  const route = useRoute()
  return computed(() => String(route.params.book ?? ''))
}
