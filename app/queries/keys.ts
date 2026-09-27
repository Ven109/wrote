/**
 * Query key factory. Keys are hierarchical so a whole subtree can be invalidated at once,
 * e.g. `invalidateQueries({ key: bookKeys.book(id) })` refreshes everything of one book.
 */
export const bookKeys = {
  list: () => ['books'] as const,
  book: (bookId: string) => ['book', bookId] as const,
  summary: (bookId: string) => ['book', bookId, 'summary'] as const,
  structure: (bookId: string) => ['book', bookId, 'structure'] as const,
  entry: (bookId: string, entryId: string) => ['book', bookId, 'entry', entryId] as const,
  document: (bookId: string, path: string) => ['book', bookId, 'document', path] as const,
  search: (bookId: string, query: string) => ['book', bookId, 'search', query] as const,
}
