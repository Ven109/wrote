import { defineQueryOptions } from '@pinia/colada'
import type { NoteCounts, NotesQuery, NoteSummary } from '#shared/schemas/notes'
import { bookKeys } from './keys'

const base = (bookId: string) => `/api/books/${encodeURIComponent(bookId)}/notes`

export const notesQuery = defineQueryOptions(({ bookId, query }: { bookId: string, query: NotesQuery }) => ({
  key: bookKeys.noteList(bookId, query),
  query: () => $fetch<NoteSummary[]>(base(bookId), { query }),
  enabled: Boolean(bookId),
}))

export const noteCountsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.noteCounts(bookId),
  query: () => $fetch<NoteCounts>(`${base(bookId)}/counts`),
  enabled: Boolean(bookId),
}))
