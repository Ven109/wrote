import { defineQueryOptions } from '@pinia/colada'
import type { ActivityEntry, ActivityFilter } from '#shared/schemas/activity'
import { bookKeys } from './keys'

/** The book's activity log for a filter (refreshed by the `activity` SSE event). */
export const activityQuery = defineQueryOptions(({ bookId, filter }: { bookId: string, filter: Partial<ActivityFilter> }) => ({
  key: bookKeys.activityList(bookId, filter),
  query: () => $fetch<ActivityEntry[]>(`/api/books/${encodeURIComponent(bookId)}/activity`, { query: filter }),
  enabled: Boolean(bookId),
}))
