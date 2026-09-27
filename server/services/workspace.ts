import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { BOOK_CONFIG_FILE } from '#shared/schemas/book'
import { openIndexDb, type IndexDb } from '../db/client'
import { applyChange, syncIndex } from '../db/indexer'
import { NotFoundError } from '../storage/errors'
import { readTextIfExists, writeFileAtomic } from '../storage/fs'
import { createBookRepository, type BookRepository } from '../storage/repository'
import { createBookWatcher, type BookWatcher } from '../storage/watcher'
import { publishBookEvent } from '../utils/book-events'

export interface BookContext {
  id: string
  root: string
  repository: BookRepository
  watcher: BookWatcher
  db: IndexDb
  /** Resolves when in-flight index updates (watcher events, own writes) are done. */
  settle: () => Promise<void>
}

/** Directory holding the user's books. Configurable via `NUXT_WORKSPACE_DIR`. */
export function resolveWorkspaceDir(configured?: string): string {
  const dir = configured || join(homedir(), 'Wrote')
  return resolve(dir.replace(/^~(?=$|\/)/, homedir()))
}

const REGISTRY_FILE = '.wrote/workspace.json'

const RegistrySchema = z.object({
  external: z.array(z.object({ id: z.string(), path: z.string() })).default([]),
})
type Registry = z.infer<typeof RegistrySchema>

export interface BookLocation {
  id: string
  root: string
  external: boolean
}

async function readRegistry(workspaceDir: string): Promise<Registry> {
  const raw = await readTextIfExists(join(workspaceDir, REGISTRY_FILE))
  return RegistrySchema.parse(raw ? JSON.parse(raw) : {})
}

async function writeRegistry(workspaceDir: string, registry: Registry): Promise<void> {
  await writeFileAtomic(join(workspaceDir, REGISTRY_FILE), `${JSON.stringify(registry, null, 2)}\n`)
}

async function isBookFolder(root: string): Promise<boolean> {
  return await readTextIfExists(join(root, BOOK_CONFIG_FILE)) !== null
}

/** All books: folders with `wrote.json` inside the workspace plus registered external folders. */
export async function listBookLocations(workspaceDir: string): Promise<BookLocation[]> {
  await mkdir(workspaceDir, { recursive: true })
  const locations: BookLocation[] = []
  for (const item of await readdir(workspaceDir, { withFileTypes: true })) {
    const root = join(workspaceDir, item.name)
    if (item.isDirectory() && !item.name.startsWith('.') && await isBookFolder(root)) {
      locations.push({ id: item.name, root, external: false })
    }
  }
  for (const entry of (await readRegistry(workspaceDir)).external) {
    if (await isBookFolder(entry.path)) locations.push({ id: entry.id, root: entry.path, external: true })
  }
  return locations.sort((a, b) => a.id.localeCompare(b.id))
}

export async function listBookIds(workspaceDir: string): Promise<string[]> {
  return (await listBookLocations(workspaceDir)).map(location => location.id)
}

export async function resolveBookLocation(workspaceDir: string, bookId: string): Promise<BookLocation> {
  const location = /^[\w.-]+$/.test(bookId) && (await listBookLocations(workspaceDir)).find(l => l.id === bookId)
  if (!location) throw new NotFoundError(`Book "${bookId}"`)
  return location
}

/** Returns an id not used by any book or folder in the workspace, derived from `base`. */
export async function uniqueBookId(workspaceDir: string, base: string): Promise<string> {
  const taken = new Set([...await listBookIds(workspaceDir), ...await readdir(workspaceDir).catch(() => [] as string[])])
  let id = base
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
  return id
}

/** Registers a folder outside the workspace as a book (it must already contain `wrote.json`). */
export async function registerExternalBook(workspaceDir: string, path: string, id: string): Promise<void> {
  const registry = await readRegistry(workspaceDir)
  registry.external = [...registry.external.filter(entry => entry.path !== path), { id, path }]
  await writeRegistry(workspaceDir, registry)
}

export async function unregisterExternalBook(workspaceDir: string, id: string): Promise<void> {
  const registry = await readRegistry(workspaceDir)
  registry.external = registry.external.filter(entry => entry.id !== id)
  await writeRegistry(workspaceDir, registry)
}

const contexts = new Map<string, BookContext>()

/** Returns (and lazily opens) the repository + watcher for a book. */
export async function openBook(workspaceDir: string, bookId: string): Promise<BookContext> {
  const cached = contexts.get(bookId)
  if (cached) return cached
  const { root } = await resolveBookLocation(workspaceDir, bookId)
  const repository = createBookRepository(root)
  const db = await openIndexDb(root)
  await syncIndex(db, repository)

  // Keep the index current before notifying clients, for external edits and our own writes alike.
  // Handlers are tracked so closing the book waits for them instead of closing the db under them.
  const pending = new Set<Promise<void>>()
  const track = (task: () => Promise<void>) => {
    const running = task().catch(error => console.warn(`[wrote] ${bookId}: index update failed`, error))
    pending.add(running)
    void running.finally(() => pending.delete(running))
    return running
  }
  const watcher = createBookWatcher(root, {
    onChange: event => track(async () => {
      await applyChange(db, repository, event)
      publishBookEvent(bookId, event)
    }),
  })
  repository.onWrite((path, hash) => {
    watcher.ignoreOwnWrite(path, hash)
    void track(async () => {
      await applyChange(db, repository, { kind: 'changed', path })
      publishBookEvent(bookId, { kind: 'changed', path, hash })
    })
  })
  const context: BookContext = { id: bookId, root, repository, watcher, db, settle: () => Promise.allSettled([...pending]).then(() => {}) }
  contexts.set(bookId, context)
  return context
}

export async function closeBook(bookId: string): Promise<void> {
  const context = contexts.get(bookId)
  if (!context) return
  contexts.delete(bookId)
  await context.watcher.close()
  await context.settle()
  context.db.$client.close()
}

export async function closeAllBooks(): Promise<void> {
  await Promise.all([...contexts.values()].map(async (context) => {
    await context.watcher.close()
    await context.settle()
    context.db.$client.close()
  }))
  contexts.clear()
}
