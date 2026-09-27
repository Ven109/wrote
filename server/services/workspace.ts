import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { BOOK_CONFIG_FILE } from '#shared/schemas/book'
import { NotFoundError } from '../storage/errors'
import { readTextIfExists } from '../storage/fs'
import { createBookRepository, type BookRepository } from '../storage/repository'
import { createBookWatcher, type BookWatcher } from '../storage/watcher'
import { publishBookEvent } from '../utils/book-events'

export interface BookContext {
  id: string
  root: string
  repository: BookRepository
  watcher: BookWatcher
}

/** Directory holding the user's books. Configurable via `NUXT_WORKSPACE_DIR`. */
export function resolveWorkspaceDir(configured?: string): string {
  const dir = configured || join(homedir(), 'Wrote')
  return resolve(dir.replace(/^~(?=$|\/)/, homedir()))
}

/** Book ids are the folder names of books inside the workspace. */
export async function listBookIds(workspaceDir: string): Promise<string[]> {
  await mkdir(workspaceDir, { recursive: true })
  const items = await readdir(workspaceDir, { withFileTypes: true })
  const ids: string[] = []
  for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue
    if (await readTextIfExists(join(workspaceDir, item.name, BOOK_CONFIG_FILE)) !== null) ids.push(item.name)
  }
  return ids.sort()
}

const contexts = new Map<string, BookContext>()

/** Returns (and lazily opens) the repository + watcher for a book. */
export async function openBook(workspaceDir: string, bookId: string): Promise<BookContext> {
  const cached = contexts.get(bookId)
  if (cached) return cached
  if (!/^[\w.-]+$/.test(bookId) || !(await listBookIds(workspaceDir)).includes(bookId)) {
    throw new NotFoundError(`Book "${bookId}"`)
  }
  const root = join(workspaceDir, bookId)
  const repository = createBookRepository(root)
  const watcher = createBookWatcher(root, { onChange: event => publishBookEvent(bookId, event) })
  repository.onWrite((path, hash) => watcher.ignoreOwnWrite(path, hash))
  const context = { id: bookId, root, repository, watcher }
  contexts.set(bookId, context)
  return context
}

export async function closeAllBooks(): Promise<void> {
  await Promise.all([...contexts.values()].map(context => context.watcher.close()))
  contexts.clear()
}
