import type { EntryType } from '#shared/schemas/entry'
import type { IndexDb } from '../db/client'
import { NotFoundError } from '../storage/errors'
import type { BookRepository } from '../storage/repository'

export async function pathForId(db: IndexDb, id: string): Promise<string> {
  const result = await db.$client.execute({ sql: 'SELECT path FROM entries WHERE id = ?', args: [id] })
  const path = result.rows[0]?.path
  if (!path) throw new NotFoundError(`Entry ${id}`)
  return String(path)
}

/** Reads an entry by id or path. */
export async function getEntry(db: IndexDb, repository: BookRepository, ref: { id?: string, path?: string }) {
  const path = ref.path ?? await pathForId(db, ref.id!)
  return repository.read(path)
}

export interface EntrySummary {
  id: string
  path: string
  type: EntryType
  title: string
  tags: string[]
  frontmatter: Record<string, unknown>
}

/** Lists entries of the given types from the index, optionally filtered by tag or frontmatter field. */
export async function listEntrySummaries(db: IndexDb, types: EntryType[], filter: { tag?: string, field?: [string, string] } = {}): Promise<EntrySummary[]> {
  const args: string[] = [...types]
  let sql = `SELECT e.id, e.path, e.type, e.title, e.frontmatter,
      (SELECT json_group_array(tag) FROM tags t WHERE t.entry_id = e.id) AS tags
    FROM entries e WHERE e.type IN (${types.map(() => '?').join(',')})`
  if (filter.tag) {
    sql += ' AND e.id IN (SELECT entry_id FROM tags WHERE tag = ?)'
    args.push(filter.tag)
  }
  if (filter.field) {
    sql += ' AND json_extract(e.frontmatter, ?) = ?'
    args.push(`$.${filter.field[0]}`, filter.field[1])
  }
  const result = await db.$client.execute({ sql: `${sql} ORDER BY e.title`, args })
  return result.rows.map(row => ({
    id: String(row.id),
    path: String(row.path),
    type: String(row.type) as EntryType,
    title: String(row.title),
    tags: JSON.parse(String(row.tags)) as string[],
    frontmatter: JSON.parse(String(row.frontmatter)) as Record<string, unknown>,
  }))
}
