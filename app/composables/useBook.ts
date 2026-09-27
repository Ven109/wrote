import type { BookSummary, UpdateBookInput } from '#shared/schemas/library'

/** One book's summary and settings. */
export function useBook(bookId: MaybeRefOrGetter<string>) {
  const url = computed(() => `/api/books/${encodeURIComponent(toValue(bookId))}`)
  const { data: book, status, error, refresh } = useFetch<BookSummary>(url, { key: computed(() => `book:${toValue(bookId)}`) })

  async function update(changes: UpdateBookInput): Promise<BookSummary> {
    const updated = await $fetch<BookSummary>(url.value, { method: 'PATCH', body: changes })
    book.value = updated
    await refreshNuxtData('books')
    return updated
  }

  return { book, status, error, refresh, update }
}

/** The book id from the current route (`/books/:book/...`). */
export function useRouteBookId() {
  const route = useRoute()
  return computed(() => String(route.params.book ?? ''))
}
