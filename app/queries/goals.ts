import { defineQueryOptions } from '@pinia/colada'
import type { GoalProgress } from '#shared/schemas/writing'
import { bookKeys } from './keys'

/** Goals, today's writing and streaks (refreshed with the book on every change event). */
export const goalsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.goals(bookId),
  query: () => $fetch<GoalProgress>(`/api/books/${encodeURIComponent(bookId)}/goals`),
  enabled: Boolean(bookId),
}))
