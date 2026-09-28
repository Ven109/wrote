import { SnapshotSchema, type Snapshot } from '#shared/schemas/snapshot'
import type { StateDb } from './client'

export async function insertSnapshot(db: StateDb, snapshot: Snapshot): Promise<Snapshot> {
  const parsed = SnapshotSchema.parse(snapshot)
  await db.$client.execute({ sql: 'INSERT INTO snapshots (id, created_at, data) VALUES (?, ?, ?)', args: [parsed.id, parsed.createdAt, JSON.stringify(parsed)] })
  return parsed
}

export async function getSnapshot(db: StateDb, id: string): Promise<Snapshot | null> {
  const result = await db.$client.execute({ sql: 'SELECT data FROM snapshots WHERE id = ?', args: [id] })
  return result.rows[0] ? SnapshotSchema.parse(JSON.parse(String(result.rows[0].data))) : null
}

/** Snapshots, newest first; with `path` only those containing that file. */
export async function listSnapshots(db: StateDb, filter: { path?: string, auto?: boolean } = {}): Promise<Snapshot[]> {
  const where = [
    filter.path ? `EXISTS (SELECT 1 FROM json_each(json_extract(data, '$.files')) WHERE json_extract(value, '$.path') = ?)` : null,
    filter.auto !== undefined ? `json_extract(data, '$.auto') = ?` : null,
  ].filter(Boolean)
  const args = [...(filter.path ? [filter.path] : []), ...(filter.auto !== undefined ? [filter.auto ? 1 : 0] : [])]
  const result = await db.$client.execute({ sql: `SELECT data FROM snapshots ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, rowid DESC`, args })
  return result.rows.map(row => SnapshotSchema.parse(JSON.parse(String(row.data))))
}

export async function deleteSnapshotRow(db: StateDb, id: string): Promise<boolean> {
  const result = await db.$client.execute({ sql: 'DELETE FROM snapshots WHERE id = ?', args: [id] })
  return result.rowsAffected > 0
}

/** Content hashes still referenced by any snapshot (garbage collection of blobs). */
export async function referencedHashes(db: StateDb): Promise<Set<string>> {
  const result = await db.$client.execute(`SELECT DISTINCT json_extract(value, '$.hash') AS hash FROM snapshots, json_each(json_extract(snapshots.data, '$.files'))`)
  return new Set(result.rows.map(row => row.hash).filter((hash): hash is string => typeof hash === 'string'))
}
