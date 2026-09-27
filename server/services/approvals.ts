import type { ApprovalEvent, PendingApproval } from '#shared/schemas/permissions'
import { createRecordId } from '#shared/utils/ids'
import { publishApprovalEvent } from '../utils/book-events'

/** How long a tool call waits for the author before it is denied. */
export const APPROVAL_TIMEOUT_MS = 120_000

interface Waiting {
  approval: PendingApproval
  settle: (state: Exclude<ApprovalEvent['state'], 'pending'>) => void
}

const waiting = new Map<string, Waiting>()

export type ApprovalRequest = Omit<PendingApproval, 'id' | 'createdAt' | 'expiresAt'>

/**
 * Asks the author to approve a tool call and waits for the answer (approve, deny, or timeout → deny). The
 * request is pushed to the book's clients over SSE; `listApprovals` serves clients that connect later.
 */
export function requestApproval(request: ApprovalRequest, options: { timeoutMs?: number, now?: Date } = {}): Promise<boolean> {
  const now = options.now ?? new Date()
  const timeoutMs = options.timeoutMs ?? APPROVAL_TIMEOUT_MS
  const approval: PendingApproval = { ...request, id: createRecordId('apr', 10), createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + timeoutMs).toISOString() }
  return new Promise((resolve) => {
    const timer = setTimeout(() => settle('expired'), timeoutMs)
    function settle(state: Exclude<ApprovalEvent['state'], 'pending'>) {
      if (!waiting.delete(approval.id)) return
      clearTimeout(timer)
      publishApprovalEvent(approval.bookId, { approval, state })
      resolve(state === 'approved')
    }
    waiting.set(approval.id, { approval, settle })
    publishApprovalEvent(approval.bookId, { approval, state: 'pending' })
  })
}

/** Tool calls of a book waiting for the author. */
export function listApprovals(bookId: string): PendingApproval[] {
  return [...waiting.values()].map(entry => entry.approval).filter(approval => approval.bookId === bookId)
}

/** The author's answer. `false` when the request is no longer waiting (answered elsewhere or expired). */
export function decideApproval(id: string, approve: boolean): boolean {
  const entry = waiting.get(id)
  if (!entry) return false
  entry.settle(approve ? 'approved' : 'denied')
  return true
}
