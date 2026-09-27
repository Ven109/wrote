import { watch } from 'chokidar'
import { entryTypeFromPath } from '#shared/book/layout'
import type { BookChangeEvent, BookChangeKind } from '#shared/schemas/events'
import { hashContent, readTextIfExists } from './fs'
import { relativeToBook } from './paths'

export type { BookChangeEvent, BookChangeKind } from '#shared/schemas/events'

export interface WatcherOptions {
  onChange: (event: BookChangeEvent) => void
  debounceMs?: number
}

const IGNORED = /(^|[/\\])(\.wrote|\.git|node_modules)([/\\]|$)|\.tmp$|[/\\]\.reorder-/

/**
 * Watches a book folder and emits debounced, per-file change events for entry files.
 * Writes made by the app itself are registered via `ignoreOwnWrite` and not echoed back.
 */
export function createBookWatcher(root: string, { onChange, debounceMs = 150 }: WatcherOptions) {
  const ownWrites = new Map<string, string>()
  const pending = new Map<string, { kind: BookChangeKind, timer: ReturnType<typeof setTimeout> }>()

  async function flush(path: string, kind: BookChangeKind) {
    pending.delete(path)
    if (kind !== 'removed') {
      const content = await readTextIfExists(`${root}/${path}`)
      if (content === null) return
      const own = ownWrites.get(path)
      if (own && own === hashContent(content)) {
        ownWrites.delete(path)
        return
      }
    }
    onChange({ kind, path })
  }

  function schedule(kind: BookChangeKind, absolute: string) {
    const path = relativeToBook(root, absolute)
    if (!entryTypeFromPath(path)) return
    const previous = pending.get(path)
    if (previous) clearTimeout(previous.timer)
    // A removal followed by an add within the debounce window is a change (e.g. atomic save).
    const merged: BookChangeKind = previous && previous.kind !== kind ? 'changed' : kind
    pending.set(path, { kind: merged, timer: setTimeout(() => void flush(path, merged), debounceMs) })
  }

  const watcher = watch(root, { ignored: path => IGNORED.test(path), ignoreInitial: true })
  watcher
    .on('add', path => schedule('added', path))
    .on('change', path => schedule('changed', path))
    .on('unlink', path => schedule('removed', path))

  return {
    ready: new Promise<void>(resolve => watcher.once('ready', () => resolve())),
    ignoreOwnWrite(path: string, hash: string) {
      ownWrites.set(path, hash)
    },
    async close() {
      pending.forEach(({ timer }) => clearTimeout(timer))
      pending.clear()
      await watcher.close()
    },
  }
}

export type BookWatcher = ReturnType<typeof createBookWatcher>
