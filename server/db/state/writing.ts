import type { WritingSession } from '#shared/schemas/writing'
import type { StateDb } from './client'

const toSession = (row: Record<string, unknown>): WritingSession => ({
  id: String(row.id),
  day: String(row.day),
  startedAt: String(row.started_at),
  endedAt: String(row.ended_at),
  added: Number(row.added),
  deleted: Number(row.deleted),
  net: Number(row.net),
})

export async function lastSession(db: StateDb): Promise<WritingSession | null> {
  const result = await db.$client.execute('SELECT * FROM writing_sessions ORDER BY ended_at DESC LIMIT 1')
  return result.rows[0] ? toSession(result.rows[0] as Record<string, unknown>) : null
}

export async function saveSession(db: StateDb, session: WritingSession): Promise<void> {
  await db.$client.execute({
    sql: `INSERT INTO writing_sessions (id, day, started_at, ended_at, added, deleted, net) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET ended_at = excluded.ended_at, added = excluded.added, deleted = excluded.deleted, net = excluded.net`,
    args: [session.id, session.day, session.startedAt, session.endedAt, session.added, session.deleted, session.net],
  })
}

/** Sessions since a day (inclusive), oldest first. */
export async function sessionsSince(db: StateDb, day: string): Promise<WritingSession[]> {
  const result = await db.$client.execute({ sql: 'SELECT * FROM writing_sessions WHERE day >= ? ORDER BY started_at', args: [day] })
  return result.rows.map(row => toSession(row as Record<string, unknown>))
}
