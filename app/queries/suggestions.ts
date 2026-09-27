import { defineQueryOptions } from '@pinia/colada'
import type { SuggestionView } from '#shared/schemas/suggestion'
import { bookKeys } from './keys'

/** Pending suggestions of one entry (refreshed live via the `suggestion` SSE event). */
export const entrySuggestionsQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.entrySuggestions(bookId, entryId),
  query: () => $fetch<SuggestionView[]>(`/api/books/${encodeURIComponent(bookId)}/suggestions`, { query: { entryId, status: 'pending' } }),
  enabled: Boolean(bookId && entryId),
}))
