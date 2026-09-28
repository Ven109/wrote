import { mkdir, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { BOOK_CONFIG_FILE } from '#shared/schemas/book'
import { openIndexDb, type IndexDb } from '../db/client'
import { applyChange, syncIndex, type IndexedChange } from '../db/indexer'
import { closeUsageDbs } from '../db/usage'
import { NotFoundError } from '../storage/errors'
import { readTextIfExists, writeFileAtomic } from '../storage/fs'
import { createBookRepository, type BookRepository } from '../storage/repository'
import { createBookWatcher, type BookWatcher } from '../storage/watcher'
import { publishBookEvent, publishJobEvent } from '../utils/book-events'
import { openStateDb, type StateDb } from '../db/state/client'
import { WROTE_JOBS } from '../jobs'
import { scheduleEmbedding } from './embeddings'
import { importLegacySuggestions } from './suggestions'
import { scheduleSummaries } from './summary-jobs'
import { recordWriting } from './writing'
import { createJobRunner, type JobRunner } from './jobs'

export interface BookContext {
  id: string
  root: string
  /** Workspace the book was opened from (AI settings live there). */
  workspaceDir: string
  repository: BookRepository
  watcher: BookWatcher
  db: IndexDb
  /** Primary app state (jobs, later chat threads, activity). */
  state: StateDb
  jobs: JobRunner
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
  // After the index, changed text is queued for background AI work: embeddings and summaries (unique + debounced).
  const warn = (what: string) => (error: unknown) => console.warn(`[wrote] ${bookId}: could not queue ${what}`, error)
  // Scene edits count towards writing sessions and goals – recorded before clients are told, so a refresh sees them.
  const recordStats = (change: IndexedChange) => recordWriting(context, change).catch(warn('writing statistics'))
  const afterIndexed = (path: string) => {
    void scheduleEmbedding(context).catch(warn('embedding'))
    void scheduleSummaries(context, { path }).catch(warn('summaries'))
  }
  const watcher = createBookWatcher(root, {
    onChange: event => track(async () => {
      await recordStats(await applyChange(db, repository, event))
      publishBookEvent(bookId, event)
      afterIndexed(event.path)
    }),
  })
  repository.onWrite((path, hash) => {
    if (hash) watcher.ignoreOwnWrite(path, hash)
    void track(async () => {
      await recordStats(await applyChange(db, repository, { kind: hash ? 'changed' : 'removed', path }))
      publishBookEvent(bookId, hash ? { kind: 'changed', path, hash } : { kind: 'removed', path })
      afterIndexed(path)
    })
  })
  const state = await openStateDb(root)
  // Jobs receive the full context lazily; it exists before `start()` runs any job.
  const jobs = createJobRunner({ db: state, jobs: WROTE_JOBS, book: () => context, publish: job => publishJobEvent(bookId, job) })
  const context: BookContext = { id: bookId, root, workspaceDir, repository, watcher, db, state, jobs, settle: () => Promise.allSettled([...pending]).then(() => {}) }
  contexts.set(bookId, context)
  await importLegacySuggestions(context).catch(error => console.warn(`[wrote] ${bookId}: could not import old suggestions`, error))
  await jobs.start()
  // Catch up on text changed while the book was closed (or a model switched meanwhile).
  await scheduleEmbedding(context, 0).catch(warn('embedding'))
  await scheduleSummaries(context).catch(warn('summaries'))
  return context
}

/** Books currently open in this process. */
export function openBooks(): BookContext[] {
  return [...contexts.values()]
}

async function shutdown(context: BookContext): Promise<void> {
  await context.jobs.stop()
  await context.watcher.close()
  await context.settle()
  context.db.$client.close()
  context.state.$client.close()
}

export async function closeBook(bookId: string): Promise<void> {
  const context = contexts.get(bookId)
  if (!context) return
  contexts.delete(bookId)
  await shutdown(context)
}

export async function closeAllBooks(): Promise<void> {
  await Promise.all([...contexts.values()].map(async (context) => {
    await shutdown(context)
  }))
  contexts.clear()
  await closeUsageDbs()
}
