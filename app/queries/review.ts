import { defineQueryOptions } from '@pinia/colada'
import type { ReviewAgent, ReviewRun } from '#shared/schemas/review'
import { bookKeys } from './keys'

/** Review agents of the book (built-in and custom). */
export const reviewAgentsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.reviewAgents(bookId),
  query: () => $fetch<ReviewAgent[]>(`/api/books/${encodeURIComponent(bookId)}/review/agents`),
  enabled: Boolean(bookId),
}))

/** Review runs that covered a scene, newest first. */
export const reviewRunsQuery = defineQueryOptions(({ bookId, sceneId, enabled }: { bookId: string, sceneId: string, enabled: boolean }) => ({
  key: bookKeys.reviewRuns(bookId, sceneId),
  query: () => $fetch<ReviewRun[]>(`/api/books/${encodeURIComponent(bookId)}/review/runs`, { query: { sceneId } }),
  enabled: Boolean(bookId && sceneId && enabled),
  staleTime: 0,
}))

/** The book's custom agent files and the ones that are not valid (with why). */
export const agentFilesQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.agentFiles(bookId),
  query: () => $fetch<{ agents: ReviewAgent[], problems: { file: string, message: string }[] }>(`/api/books/${encodeURIComponent(bookId)}/review/agent-files`),
  enabled: Boolean(bookId),
}))
