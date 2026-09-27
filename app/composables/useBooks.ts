import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { BookSummary, CreateBookInput } from '#shared/schemas/library'
import { booksQuery } from '~/queries/books'
import { bookKeys } from '~/queries/keys'

export interface CreatedBook {
  book: BookSummary
  firstScenePath: string
}

/** The workspace's books plus actions to create, open and remove them. */
export function useBooks() {
  const queryCache = useQueryCache()
  const { data, status, error, refresh } = useQuery(booksQuery)
  const books = computed(() => data.value ?? [])
  const invalidate = () => queryCache.invalidateQueries({ key: bookKeys.list() })

  const { mutateAsync: createBook } = useMutation({
    mutation: (input: CreateBookInput) => $fetch<CreatedBook>('/api/books', { method: 'POST', body: input }),
    onSettled: invalidate,
  })

  const { mutateAsync: openFolder } = useMutation({
    mutation: (path: string) => $fetch<BookSummary>('/api/books/open', { method: 'POST', body: { path } }),
    onSettled: invalidate,
  })

  const { mutateAsync: removeBook } = useMutation({
    mutation: (id: string) => $fetch(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    // Optimistically drop the book from the list; restore it if the request fails.
    onMutate(id) {
      const previous = queryCache.getQueryData<BookSummary[]>(bookKeys.list())
      queryCache.setQueryData(bookKeys.list(), (previous ?? []).filter(book => book.id !== id))
      return { previous }
    },
    onError(_error, _id, context) {
      if (context?.previous) queryCache.setQueryData(bookKeys.list(), context.previous)
    },
    onSettled: invalidate,
  })

  return { books, status, error, refresh, createBook, openFolder, removeBook }
}

/** URL of the editor for an entry path. */
export function writeRoute(bookId: string, path?: string): string {
  return path ? `/books/${bookId}/write/${path}` : `/books/${bookId}/write`
}
