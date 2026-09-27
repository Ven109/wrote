import { eq, inArray } from 'drizzle-orm'
import { extractWikiLinks } from '#shared/utils/links'
import { countWords } from '#shared/utils/word-count'
import type { StoredEntry } from '../storage/entries'
import type { BookRepository } from '../storage/repository'
import type { IndexDb } from './client'
import { entries, entryNames, links, tags } from './schema'

function namesOf(entry: StoredEntry): string[] {
  const aliases = 'aliases' in entry.frontmatter ? entry.frontmatter.aliases as string[] : []
  return [...new Set([entry.frontmatter.id, entry.frontmatter.title, ...aliases].map(name => name.toLowerCase()))]
}

/** Inserts or replaces one entry and its derived rows (tags, links, names, full-text). */
export async function indexEntry(db: IndexDb, entry: StoredEntry): Promise<void> {
  const fm = entry.frontmatter
  const id = fm.id
  await removeEntryRows(db, [id], entry.path)
  await db.insert(entries).values({
    id,
    path: entry.path,
    type: entry.type,
    title: fm.title,
    status: 'status' in fm ? String(fm.status) : null,
    pinned: 'pinned' in fm ? Boolean(fm.pinned) : false,
    wordCount: countWords(entry.body),
    hash: entry.hash,
    updatedAt: fm.updated ?? null,
    frontmatter: fm as Record<string, unknown>,
  })
  if (fm.tags.length) await db.insert(tags).values([...new Set(fm.tags)].map(tag => ({ entryId: id, tag })))
  await db.insert(entryNames).values(namesOf(entry).map(name => ({ entryId: id, name })))
  const found = extractWikiLinks(entry.body)
  if (found.length) {
    await db.insert(links).values(found.map(link => ({ sourceId: id, target: link.target.toLowerCase(), label: link.label })))
  }
  await db.$client.execute({ sql: 'INSERT INTO entries_fts (id, title, body) VALUES (?, ?, ?)', args: [id, fm.title, entry.body] })
}

async function removeEntryRows(db: IndexDb, ids: string[], path?: string) {
  const byPath = path ? await db.select({ id: entries.id }).from(entries).where(eq(entries.path, path)) : []
  const all = [...new Set([...ids, ...byPath.map(row => row.id)])]
  if (!all.length) return
  await db.delete(entries).where(inArray(entries.id, all))
  await db.$client.execute({ sql: `DELETE FROM entries_fts WHERE id IN (${all.map(() => '?').join(',')})`, args: all })
}

export async function removeFromIndex(db: IndexDb, path: string): Promise<void> {
  await removeEntryRows(db, [], path)
}

export interface RebuildResult {
  indexed: number
  unchanged: number
  removed: number
  errors: string[]
}

export interface SyncOptions {
  /** Re-index every entry, even unchanged ones. */
  force?: boolean
  /** Called after each entry with (done, total). */
  onProgress?: (done: number, total: number) => void | Promise<void>
  signal?: AbortSignal
}

/** Syncs the index with the book folder: re-indexes changed files, drops deleted ones. */
export async function syncIndex(db: IndexDb, repository: BookRepository, options: SyncOptions = {}): Promise<RebuildResult> {
  const { entries: onDisk, errors } = await repository.list()
  const known = new Map((await db.select({ path: entries.path, hash: entries.hash }).from(entries)).map(row => [row.path, row.hash]))
  const result: RebuildResult = { indexed: 0, unchanged: 0, removed: 0, errors: errors.map(error => error.message) }
  for (const [done, entry] of onDisk.entries()) {
    options.signal?.throwIfAborted()
    await options.onProgress?.(done, onDisk.length)
    if (!options.force && known.get(entry.path) === entry.hash) {
      result.unchanged++
    }
    else {
      await indexEntry(db, entry)
      result.indexed++
    }
    known.delete(entry.path)
  }
  for (const path of known.keys()) {
    await removeFromIndex(db, path)
    result.removed++
  }
  return result
}

/** Applies a single file change (from the watcher or an own write) to the index. */
export async function applyChange(db: IndexDb, repository: BookRepository, change: { kind: string, path: string }): Promise<void> {
  if (change.kind === 'removed') return removeFromIndex(db, change.path)
  try {
    await indexEntry(db, await repository.read(change.path))
  }
  catch {
    await removeFromIndex(db, change.path)
  }
}
