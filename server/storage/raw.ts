import { rm, rmdir } from 'node:fs/promises'
import { dirname } from 'node:path'
import { FOLDER_INDEX_FILE } from '#shared/book/layout'
import { hashContent, readTextIfExists, writeFileAtomic } from './fs'
import { resolveInBook } from './paths'

/** The raw text of a book file, or `null` if it does not exist. */
export function readRawFile(root: string, path: string): Promise<string | null> {
  return readTextIfExists(resolveInBook(root, path))
}

/**
 * Puts a book file back into a recorded state (`null` removes it). Writes and removals are announced through
 * `onWrite` (hash `null` = removed) so the index follows right away.
 */
export async function restoreRawFile(root: string, path: string, content: string | null, onWrite?: (path: string, hash: string | null) => void): Promise<void> {
  const absolute = resolveInBook(root, path)
  if (content === null) {
    await rm(absolute, { force: true })
    // A part/chapter is a folder with an index file: drop the folder too once it is empty.
    if (path.endsWith(`/${FOLDER_INDEX_FILE}`)) await rmdir(dirname(absolute)).catch(() => {})
    onWrite?.(path, null)
    return
  }
  await writeFileAtomic(absolute, content)
  onWrite?.(path, hashContent(content))
}
