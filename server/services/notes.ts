import { BOOK_LAYOUT } from '#shared/book/layout'
import type { CaptureNoteInput, NoteCounts, NotesQuery, NoteSummary } from '#shared/schemas/notes'
import { splitCapture } from '#shared/utils/notes'
import { applyChange } from '../db/indexer'
import { toFtsQuery } from '../db/queries'
import { InvalidPathError } from '../storage/errors'
import type { BookContext } from './workspace'

const INBOX_PREFIX = `${BOOK_LAYOUT.inbox}/`
const RECENT_LIMIT = 20

function notesSql(query: NotesQuery): { sql: string, args: (string | number)[] } {
  const where = [`e.type = 'note'`]
  const args: (string | number)[] = []
  if (query.filter === 'inbox') {
    where.push('e.path LIKE ?')
    args.push(`${INBOX_PREFIX}%`)
  }
  if (query.filter === 'pinned') where.push('e.pinned = 1')
  if (query.tag) {
    where.push('e.id IN (SELECT entry_id FROM tags WHERE tag = ?)')
    args.push(query.tag)
  }
  const fts = query.q ? toFtsQuery(query.q) : null
  if (fts) {
    where.push('e.id IN (SELECT id FROM entries_fts WHERE entries_fts MATCH ?)')
    args.push(fts)
  }
  const order = query.filter === 'recent' ? 'e.updated_at DESC' : 'e.pinned DESC, e.updated_at DESC'
  const limit = query.filter === 'recent' ? ` LIMIT ${RECENT_LIMIT}` : ''
  const sql = `SELECT e.id, e.path, e.title, e.pinned, e.updated_at,
      (SELECT json_group_array(tag) FROM tags t WHERE t.entry_id = e.id) AS tags,
      substr(f.body, 1, 160) AS excerpt
    FROM entries e JOIN entries_fts f ON f.id = e.id
    WHERE ${where.join(' AND ')} ORDER BY ${order}, e.title${limit}`
  return { sql, args }
}

/** Notes matching a filter (all/inbox/pinned/recent), tag and full-text query. Pinned first. */
export async function listNotes(book: BookContext, query: NotesQuery): Promise<NoteSummary[]> {
  if (query.q && !toFtsQuery(query.q)) return []
  const result = await book.db.$client.execute(notesSql(query))
  return result.rows.map(row => ({
    id: String(row.id),
    path: String(row.path),
    title: String(row.title),
    tags: JSON.parse(String(row.tags)) as string[],
    pinned: Number(row.pinned) === 1,
    inbox: String(row.path).startsWith(INBOX_PREFIX),
    updated: row.updated_at ? String(row.updated_at) : null,
    excerpt: String(row.excerpt ?? '').replace(/\s+/g, ' ').trim(),
  }))
}

export async function noteCounts(book: BookContext): Promise<NoteCounts> {
  const [totals, tags] = await Promise.all([
    book.db.$client.execute({
      sql: `SELECT COUNT(*) AS all_count, SUM(path LIKE ?) AS inbox, SUM(pinned) AS pinned FROM entries WHERE type = 'note'`,
      args: [`${INBOX_PREFIX}%`],
    }),
    book.db.$client.execute(`SELECT t.tag, COUNT(*) AS count FROM tags t JOIN entries e ON e.id = t.entry_id
      WHERE e.type = 'note' GROUP BY t.tag ORDER BY count DESC, t.tag`),
  ])
  const row = totals.rows[0]
  return {
    all: Number(row?.all_count ?? 0),
    inbox: Number(row?.inbox ?? 0),
    pinned: Number(row?.pinned ?? 0),
    tags: tags.rows.map(tag => ({ tag: String(tag.tag), count: Number(tag.count) })),
  }
}

/** Quick capture into the inbox. */
export async function captureNote(book: BookContext, input: CaptureNoteInput): Promise<{ id: string, path: string }> {
  const { title, body } = splitCapture(input.text)
  const entry = await book.repository.create({ type: 'note', dir: BOOK_LAYOUT.inbox, title, body })
  await applyChange(book.db, book.repository, { kind: 'added', path: entry.path })
  return { id: entry.frontmatter.id, path: entry.path }
}

/** Files an inbox note into `notes/`. */
export async function fileNote(book: BookContext, path: string): Promise<{ path: string }> {
  if (!path.startsWith(INBOX_PREFIX)) throw new InvalidPathError(`${path} (not in the inbox)`)
  const next = await book.repository.move(path, BOOK_LAYOUT.notes)
  await applyChange(book.db, book.repository, { kind: 'removed', path })
  await applyChange(book.db, book.repository, { kind: 'added', path: next })
  return { path: next }
}
