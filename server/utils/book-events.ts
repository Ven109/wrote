import type { BookChangeEvent } from '#shared/schemas/events'
import type { Job } from '#shared/schemas/jobs'

type Listener = (event: BookChangeEvent) => void

const listeners = new Map<string, Set<Listener>>()

/** In-process pub/sub for book change events (watcher → SSE clients, indexer, …). */
export function subscribeBookEvents(bookId: string, listener: Listener): () => void {
  const set = listeners.get(bookId) ?? new Set()
  set.add(listener)
  listeners.set(bookId, set)
  return () => {
    set.delete(listener)
    if (!set.size) listeners.delete(bookId)
  }
}

export function publishBookEvent(bookId: string, event: BookChangeEvent): void {
  listeners.get(bookId)?.forEach(listener => listener(event))
}

type JobListener = (job: Job) => void

const jobListeners = new Map<string, Set<JobListener>>()

/** In-process pub/sub for background job updates (runner → SSE clients). */
export function subscribeJobEvents(bookId: string, listener: JobListener): () => void {
  const set = jobListeners.get(bookId) ?? new Set()
  set.add(listener)
  jobListeners.set(bookId, set)
  return () => {
    set.delete(listener)
    if (!set.size) jobListeners.delete(bookId)
  }
}

export function publishJobEvent(bookId: string, job: Job): void {
  jobListeners.get(bookId)?.forEach(listener => listener(job))
}
