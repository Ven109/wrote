import { defineQueryOptions } from '@pinia/colada'
import type { NoteCounts, NotesQuery, NoteSummary } from '#shared/schemas/notes'
import type { TriageSuggestions } from '#shared/schemas/triage'
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

/** Triage suggestions for an inbox note (refetched with the book on changes). */
export const noteTriageQuery = defineQueryOptions(({ bookId, path, enabled }: { bookId: string, path: string, enabled: boolean }) => ({
  key: bookKeys.noteTriage(bookId, path),
  query: () => $fetch<TriageSuggestions>(`${base(bookId)}/triage`, { query: { path } }),
  enabled: Boolean(bookId && path) && enabled,
}))
