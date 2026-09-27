import type { ContextSnapshot } from '#shared/schemas/context'
import { createRecordId } from '#shared/utils/ids'
import type { StateDb } from './client'

/** Snapshots older than this are pruned when new ones are saved. */
const KEEP_DAYS = 90

const toSnapshot = (row: Record<string, unknown>): ContextSnapshot => ({
  id: String(row.id),
  createdAt: String(row.created_at),
  feature: String(row.feature),
  model: String(row.model),
  budget: Number(row.budget),
  used: Number(row.used),
  items: JSON.parse(String(row.items)),
  omitted: JSON.parse(String(row.omitted)),
  system: String(row.system),
})

export async function saveContextSnapshot(db: StateDb, snapshot: Omit<ContextSnapshot, 'id' | 'createdAt'>, now: Date): Promise<ContextSnapshot> {
  const id = createRecordId('ctx')
  const cutoff = new Date(now.getTime() - KEEP_DAYS * 86_400_000).toISOString()
  await db.$client.batch([
    { sql: 'DELETE FROM ai_context_snapshots WHERE created_at < ?', args: [cutoff] },
    {
      sql: `INSERT INTO ai_context_snapshots (id, created_at, feature, model, budget, used, items, omitted, system) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, now.toISOString(), snapshot.feature, snapshot.model, snapshot.budget, snapshot.used, JSON.stringify(snapshot.items), JSON.stringify(snapshot.omitted), snapshot.system],
    },
  ], 'write')
  return { ...snapshot, id, createdAt: now.toISOString() }
}

export async function getContextSnapshot(db: StateDb, id: string): Promise<ContextSnapshot | null> {
  const result = await db.$client.execute({ sql: 'SELECT * FROM ai_context_snapshots WHERE id = ?', args: [id] })
  return result.rows[0] ? toSnapshot(result.rows[0] as Record<string, unknown>) : null
}
