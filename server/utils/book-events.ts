import type { BookChangeEvent } from '#shared/schemas/events'
import type { Job } from '#shared/schemas/jobs'
import type { ApprovalEvent } from '#shared/schemas/permissions'
import type { SuggestionEvent } from '#shared/schemas/suggestion'

/** A per-book in-process pub/sub channel (server → SSE clients). */
function createBookChannel<T>() {
  const listeners = new Map<string, Set<(value: T) => void>>()
  return {
    subscribe(bookId: string, listener: (value: T) => void): () => void {
      const set = listeners.get(bookId) ?? new Set()
      set.add(listener)
      listeners.set(bookId, set)
      return () => {
        set.delete(listener)
        if (!set.size) listeners.delete(bookId)
      }
    },
    publish(bookId: string, value: T): void {
      listeners.get(bookId)?.forEach(listener => listener(value))
    },
  }
}

const changes = createBookChannel<BookChangeEvent>()
const jobs = createBookChannel<Job>()
const suggestions = createBookChannel<SuggestionEvent>()
const approvals = createBookChannel<ApprovalEvent>()

/** File changes of a book (watcher and own writes → SSE clients). */
export const subscribeBookEvents = changes.subscribe
export const publishBookEvent = changes.publish
/** Background job updates (runner → SSE clients). */
export const subscribeJobEvents = jobs.subscribe
export const publishJobEvent = jobs.publish
/** Suggestions created or resolved (they live in state.db, so no file event announces them). */
export const subscribeSuggestionEvents = suggestions.subscribe
export const publishSuggestionEvent = suggestions.publish
/** Tool calls waiting for (or answered by) the author (permission model). */
export const subscribeApprovalEvents = approvals.subscribe
export const publishApprovalEvent = approvals.publish
