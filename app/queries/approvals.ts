import { defineQueryOptions } from '@pinia/colada'
import type { PendingApproval } from '#shared/schemas/permissions'
import { bookKeys } from './keys'

/** Tool calls on a book waiting for the author (kept current by the `approval` SSE event). */
export const approvalsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.approvals(bookId),
  query: () => $fetch<PendingApproval[]>(`/api/books/${encodeURIComponent(bookId)}/approvals`),
  enabled: Boolean(bookId),
}))
