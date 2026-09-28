import { CommentSchema, type Comment } from '#shared/schemas/comments'
import type { StateDb } from './client'

const parse = (row: Record<string, unknown>) => CommentSchema.parse(JSON.parse(String(row.data)))

export async function upsertComment(db: StateDb, comment: Comment): Promise<Comment> {
  const parsed = CommentSchema.parse(comment)
  await db.$client.execute({
    sql: `INSERT INTO comments (id, entry_id, resolved, created_at, data) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET resolved = excluded.resolved, data = excluded.data`,
    args: [parsed.id, parsed.entryId, parsed.resolvedAt ? 1 : 0, parsed.createdAt, JSON.stringify(parsed)],
  })
  return parsed
}

export async function findComments(db: StateDb, filter: { entryId?: string, id?: string, includeResolved?: boolean } = {}): Promise<Comment[]> {
  const where: string[] = []
  const args: string[] = []
  if (filter.entryId) {
    where.push('entry_id = ?')
    args.push(filter.entryId)
  }
  if (filter.id) {
    where.push('id = ?')
    args.push(filter.id)
  }
  if (!filter.includeResolved && !filter.id) where.push('resolved = 0')
  const result = await db.$client.execute({ sql: `SELECT data FROM comments ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at, rowid`, args })
  return result.rows.map(row => parse(row as Record<string, unknown>))
}
