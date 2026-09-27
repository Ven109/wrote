import { defineQueryOptions } from '@pinia/colada'
import type { ChatThread } from '#shared/schemas/chat'
import { bookKeys } from './keys'

export const chatThreadsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.chatThreads(bookId),
  query: () => $fetch<ChatThread[]>(`/api/books/${encodeURIComponent(bookId)}/chat/threads`),
  enabled: Boolean(bookId),
}))
