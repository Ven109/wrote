/**
 * Serializes writes per path so each one starts after the previous finished (and can use the hash it
 * produced). `pendingBody(path)` is the latest body queued for a path while writes are in flight.
 */
export function useSaveQueue() {
  const tails = new Map<string, Promise<unknown>>()
  const pending = shallowReactive(new Map<string, string>())

  function enqueue<T>(path: string, body: string, task: () => Promise<T>): Promise<T> {
    const previous = tails.get(path) ?? Promise.resolve()
    const next = previous.then(task, task)
    tails.set(path, next)
    pending.set(path, body)
    const settle = () => {
      if (tails.get(path) !== next) return
      tails.delete(path)
      pending.delete(path)
    }
    next.then(settle, settle)
    return next
  }

  return {
    enqueue,
    pendingBody: (path: string) => pending.get(path),
    isPending: (path: string) => pending.has(path),
  }
}
