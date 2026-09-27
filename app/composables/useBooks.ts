import type { BookSummary, CreateBookInput } from '#shared/schemas/library'

export interface CreatedBook {
  book: BookSummary
  firstScenePath: string
}

/** The workspace's books plus actions to create, open and remove them. */
export function useBooks() {
  const { data: books, status, error, refresh } = useFetch<BookSummary[]>('/api/books', { key: 'books', default: () => [] })

  async function createBook(input: CreateBookInput): Promise<CreatedBook> {
    const created = await $fetch<CreatedBook>('/api/books', { method: 'POST', body: input })
    await refresh()
    return created
  }

  async function openFolder(path: string): Promise<BookSummary> {
    const book = await $fetch<BookSummary>('/api/books/open', { method: 'POST', body: { path } })
    await refresh()
    return book
  }

  async function removeBook(id: string): Promise<void> {
    await $fetch(`/api/books/${encodeURIComponent(id)}`, { method: 'DELETE' })
    await refresh()
  }

  return { books, status, error, refresh, createBook, openFolder, removeBook }
}

/** URL of the editor for an entry path. */
export function writeRoute(bookId: string, path?: string): string {
  return path ? `/books/${bookId}/write/${path}` : `/books/${bookId}/write`
}
