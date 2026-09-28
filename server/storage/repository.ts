import type { BookConfigInput } from '#shared/schemas/book'
import { readBookConfig, writeBookConfig } from './config'
import { listEntries, readEntry } from './entries'
import { readMarkdownFiles } from './fs'
import { resolveInBook } from './paths'
import { readRawFile, restoreRawFile } from './raw'
import { createEntry, moveEntry, trashEntry, type CreateEntryInput } from './mutations'
import { listOrderedChildren, reorderChildren } from './reorder'
import { writeEntry, type EntryContent } from './write'

/** `hash` is `null` when the file was removed (undo of a created file). */
export type WriteListener = (path: string, hash: string | null) => void

/**
 * File repository for one book folder: the only place that reads and writes book files.
 * Every write notifies listeners (used by the watcher to ignore our own writes).
 */
export function createBookRepository(root: string) {
  const listeners = new Set<WriteListener>()
  const onWrite: WriteListener = (path, hash) => listeners.forEach(listener => listener(path, hash))

  return {
    root,
    onWrite(listener: WriteListener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    readConfig: () => readBookConfig(root),
    writeConfig: (config: BookConfigInput) => writeBookConfig(root, config),
    list: () => listEntries(root),
    read: (path: string) => readEntry(root, path),
    write: (path: string, content: EntryContent, expectedHash?: string) => writeEntry(root, path, content, { expectedHash, onWrite }),
    create: (input: CreateEntryInput) => createEntry(root, input, { onWrite }),
    move: (path: string, targetDir: string) => moveEntry(root, path, targetDir),
    trash: (path: string) => trashEntry(root, path),
    listOrdered: (dir: string) => listOrderedChildren(root, dir),
    reorder: (dir: string, ordered: string[]) => reorderChildren(root, dir, ordered),
    /** Raw file text (activity log snapshots). */
    readRaw: (path: string) => readRawFile(root, path),
    /** Restores a recorded raw file state; `null` removes the file (undo). */
    restoreRaw: (path: string, content: string | null) => restoreRawFile(root, path, content, onWrite),
    /** Writes (or with `null` removes) a non-entry book file such as `agents/<id>.md`. */
    writeRaw: (path: string, content: string | null) => restoreRawFile(root, path, content, onWrite),
    /** The `.md` files directly in a book folder (name → text); `null` when the folder does not exist. */
    readFolder: (dir: string) => readMarkdownFiles(resolveInBook(root, dir)),
  }
}

export type BookRepository = ReturnType<typeof createBookRepository>
