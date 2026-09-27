import type { BookChangeEvent } from '#shared/schemas/events'

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
