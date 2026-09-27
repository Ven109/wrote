import { defineQueryOptions } from '@pinia/colada'
import type { Summary } from '#shared/schemas/summaries'
import { bookKeys } from './keys'

/** The rolling summary of one scene, chapter or part (`null` until one is written). */
export const summaryQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.entrySummary(bookId, entryId),
  query: async () => (await $fetch<{ summary: Summary | null }>(`/api/books/${bookId}/summaries`, { query: { entryId } })).summary,
  enabled: Boolean(bookId && entryId),
}))
