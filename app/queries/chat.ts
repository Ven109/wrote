import { defineQueryOptions } from '@pinia/colada'
import type { ChatThread } from '#shared/schemas/chat'
import type { ContextSnapshot } from '#shared/schemas/context'
import { bookKeys } from './keys'

export const chatThreadsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.chatThreads(bookId),
  query: () => $fetch<ChatThread[]>(`/api/books/${encodeURIComponent(bookId)}/chat/threads`),
  enabled: Boolean(bookId),
}))

/** What was sent with one assistant answer. Snapshots never change. */
export const contextSnapshotQuery = defineQueryOptions(({ bookId, snapshotId }: { bookId: string, snapshotId: string }) => ({
  key: bookKeys.contextSnapshot(bookId, snapshotId),
  query: () => $fetch<ContextSnapshot>(`/api/books/${encodeURIComponent(bookId)}/context/${snapshotId}`),
  enabled: Boolean(bookId && snapshotId),
  staleTime: Number.POSITIVE_INFINITY,
}))
