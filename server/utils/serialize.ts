/**
 * Runs tasks one after another per key (e.g. per workspace): read-modify-write updates of a settings file
 * must not interleave, or concurrent changes get lost.
 */
export function createSerializer() {
  const locks = new Map<string, Promise<unknown>>()
  return function serialized<T>(key: string, task: () => Promise<T>): Promise<T> {
    const previous = locks.get(key) ?? Promise.resolve()
    const next = previous.then(task, task)
    locks.set(key, next)
    const release = () => {
      if (locks.get(key) === next) locks.delete(key)
    }
    next.then(release, release)
    return next
  }
}
