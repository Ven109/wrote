import { ActivityEntrySchema, type ActivityEntry, type ActivityFilter } from '#shared/schemas/activity'
import type { StateDb } from './client'

const parse = (row: Record<string, unknown>) => ActivityEntrySchema.parse(JSON.parse(String(row.data)))

export async function upsertActivity(db: StateDb, entry: ActivityEntry): Promise<ActivityEntry> {
  const parsed = ActivityEntrySchema.parse(entry)
  await db.$client.execute({
    sql: `INSERT INTO activity_log (id, created_at, actor_kind, tool, data) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    args: [parsed.id, parsed.createdAt, parsed.actor.kind, parsed.tool, JSON.stringify(parsed)],
  })
  return parsed
}

export async function findActivity(db: StateDb, id: string): Promise<ActivityEntry | null> {
  const result = await db.$client.execute({ sql: 'SELECT data FROM activity_log WHERE id = ?', args: [id] })
  const row = result.rows[0]
  return row ? parse(row as Record<string, unknown>) : null
}

/** Newest first. */
export async function listActivity(db: StateDb, filter: ActivityFilter): Promise<ActivityEntry[]> {
  const where: string[] = []
  const args: (string | number)[] = []
  const add = (clause: string, value: string | undefined) => {
    if (value === undefined) return
    where.push(clause)
    args.push(value)
  }
  add('actor_kind = ?', filter.actor)
  add('tool = ?', filter.tool)
  add('created_at >= ?', filter.since)
  add('created_at <= ?', filter.until)
  const result = await db.$client.execute({
    sql: `SELECT data FROM activity_log ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    args: [...args, filter.limit],
  })
  return result.rows.map(row => parse(row as Record<string, unknown>))
}
