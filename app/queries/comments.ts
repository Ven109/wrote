import { defineQueryOptions } from '@pinia/colada'
import type { CommentView } from '#shared/schemas/comments'
import { bookKeys } from './keys'

/** Open comments of an entry (refreshed by the `comment` SSE event). */
export const entryCommentsQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.entryComments(bookId, entryId),
  query: () => $fetch<CommentView[]>(`/api/books/${encodeURIComponent(bookId)}/comments`, { query: { entryId } }),
  enabled: Boolean(bookId && entryId),
}))
