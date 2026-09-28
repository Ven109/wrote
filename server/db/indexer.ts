import { eq, inArray } from 'drizzle-orm'
import { extractWikiLinks } from '#shared/utils/links'
import { parseOutline } from '#shared/utils/outline-format'
import { countWords } from '#shared/utils/word-count'
import { chunkMarkdown } from '../search/chunk'
import type { StoredEntry } from '../storage/entries'
import type { BookRepository } from '../storage/repository'
import type { IndexDb } from './client'
import { chunks, entries, entryNames, links, tags } from './schema'

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
  if (entry.type === 'outline') await indexBeats(db, id, entry.body)
  // Chunks only; their vectors are computed later by the background `embed` job.
  const pieces = chunkMarkdown(fm.title, entry.body)
  if (pieces.length) await db.insert(chunks).values(pieces.map(chunk => ({ entryId: id, seq: chunk.seq, hash: chunk.hash, text: chunk.text })))
}

/** Beats of the outline (with ids; hand-written ones get theirs when the outline is next saved). */
async function indexBeats(db: IndexDb, entryId: string, body: string) {
  let position = 0
  for (const act of parseOutline(body).acts) {
    for (const beat of act.beats.filter(candidate => candidate.id)) {
      const inserted = await db.$client.execute({
        sql: 'INSERT OR IGNORE INTO beats (id, entry_id, act_id, act_title, title, summary, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [beat.id, entryId, act.id, act.title, beat.title, beat.summary, position++],
      })
      if (!inserted.rowsAffected) continue
      for (const [index, sceneId] of beat.scenes.entries()) {
        await db.$client.execute({ sql: 'INSERT INTO beat_scenes (beat_id, scene_id, position) VALUES (?, ?, ?)', args: [beat.id, sceneId, index] })
      }
    }
  }
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
/** An applied change with the entry's text before and after (for writing statistics). */
export interface IndexedChange {
  path: string
  type: string | null
  before: string | null
  after: string | null
}

async function indexedBody(db: IndexDb, path: string): Promise<{ type: string, body: string } | null> {
  const result = await db.$client.execute({ sql: 'SELECT e.type AS type, f.body AS body FROM entries e JOIN entries_fts f ON f.id = e.id WHERE e.path = ?', args: [path] })
  const row = result.rows[0]
  return row ? { type: String(row.type), body: String(row.body ?? '') } : null
}

export async function applyChange(db: IndexDb, repository: BookRepository, change: { kind: string, path: string }): Promise<IndexedChange> {
  const previous = await indexedBody(db, change.path)
  const unchanged = { path: change.path, type: previous?.type ?? null, before: previous?.body ?? null }
  if (change.kind === 'removed') {
    await removeFromIndex(db, change.path)
    return { ...unchanged, after: null }
  }
  try {
    const entry = await repository.read(change.path)
    await indexEntry(db, entry)
    return { ...unchanged, type: entry.type, after: entry.body }
  }
  catch {
    await removeFromIndex(db, change.path)
    return { ...unchanged, after: null }
  }
}
