import { defineQueryOptions } from '@pinia/colada'
import type { TimelineView } from '#shared/schemas/timeline'
import { bookKeys } from './keys'

/** Scenes and events of the book in in-world order (filters are applied on the client). */
export const timelineQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.timeline(bookId),
  query: () => $fetch<TimelineView>(`/api/books/${encodeURIComponent(bookId)}/timeline`),
  enabled: Boolean(bookId),
}))
