import type { Summary, SummaryScope } from '#shared/schemas/summaries'
import type { StateDb } from './client'

/** A stored summary plus what a generated one was made from (never sent to clients). */
export interface StoredSummary extends Summary {
  sourceText: string | null
  sourceHash: string | null
}

const toSummary = (row: Record<string, unknown>): StoredSummary => ({
  entryId: String(row.entry_id),
  scope: String(row.scope) as SummaryScope,
  text: String(row.text),
  isManual: Boolean(row.is_manual),
  model: row.model === null ? null : String(row.model),
  updatedAt: String(row.updated_at),
  sourceText: row.source_text === null ? null : String(row.source_text),
  sourceHash: row.source_hash === null ? null : String(row.source_hash),
})

export async function getSummary(db: StateDb, entryId: string): Promise<StoredSummary | null> {
  const result = await db.$client.execute({ sql: 'SELECT * FROM summaries WHERE entry_id = ?', args: [entryId] })
  return result.rows[0] ? toSummary(result.rows[0] as Record<string, unknown>) : null
}

export async function listSummaries(db: StateDb): Promise<StoredSummary[]> {
  const result = await db.$client.execute('SELECT * FROM summaries')
  return result.rows.map(row => toSummary(row as Record<string, unknown>))
}

export interface GeneratedSummary {
  entryId: string
  scope: SummaryScope
  text: string
  sourceText: string | null
  sourceHash: string
  model: string
}

/** Stores a generated summary – unless the author has written one meanwhile (manual ones always win). */
export async function saveGeneratedSummary(db: StateDb, summary: GeneratedSummary, now: Date): Promise<boolean> {
  const result = await db.$client.execute({
    sql: `INSERT INTO summaries (entry_id, scope, text, source_text, source_hash, is_manual, model, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
          ON CONFLICT(entry_id) DO UPDATE SET scope = excluded.scope, text = excluded.text, source_text = excluded.source_text,
            source_hash = excluded.source_hash, model = excluded.model, updated_at = excluded.updated_at
          WHERE summaries.is_manual = 0`,
    args: [summary.entryId, summary.scope, summary.text, summary.sourceText, summary.sourceHash, summary.model, now.toISOString()],
  })
  return result.rowsAffected > 0
}

/** Stores the author's own summary; it is locked against regeneration until reset. */
export async function saveManualSummary(db: StateDb, summary: { entryId: string, scope: SummaryScope, text: string }, now: Date): Promise<StoredSummary> {
  const result = await db.$client.execute({
    sql: `INSERT INTO summaries (entry_id, scope, text, is_manual, model, updated_at) VALUES (?, ?, ?, 1, NULL, ?)
          ON CONFLICT(entry_id) DO UPDATE SET scope = excluded.scope, text = excluded.text, is_manual = 1, model = NULL,
            source_text = NULL, source_hash = NULL, updated_at = excluded.updated_at
          RETURNING *`,
    args: [summary.entryId, summary.scope, summary.text, now.toISOString()],
  })
  return toSummary(result.rows[0] as Record<string, unknown>)
}

export async function deleteSummary(db: StateDb, entryId: string): Promise<boolean> {
  const result = await db.$client.execute({ sql: 'DELETE FROM summaries WHERE entry_id = ?', args: [entryId] })
  return result.rowsAffected > 0
}

/** Removes summaries of entries that no longer exist (the book summary is kept). */
export async function pruneSummaries(db: StateDb, keep: string[]): Promise<number> {
  const ids = [...new Set(keep)]
  const result = await db.$client.execute({
    sql: `DELETE FROM summaries WHERE entry_id NOT IN (${ids.map(() => '?').join(', ') || '\'\''})`,
    args: ids,
  })
  return result.rowsAffected
}

const dayOf = (now: Date) => now.toISOString().slice(0, 10)

export async function recordUsage(db: StateDb, feature: string, tokens: number, now: Date): Promise<void> {
  await db.$client.execute({
    sql: `INSERT INTO ai_usage (day, feature, tokens) VALUES (?, ?, ?)
          ON CONFLICT(day, feature) DO UPDATE SET tokens = tokens + excluded.tokens`,
    args: [dayOf(now), feature, Math.max(0, Math.round(tokens))],
  })
}

/** Tokens a feature has used today (UTC day). */
export async function usageToday(db: StateDb, feature: string, now: Date): Promise<number> {
  const result = await db.$client.execute({ sql: 'SELECT tokens FROM ai_usage WHERE day = ? AND feature = ?', args: [dayOf(now), feature] })
  return Number(result.rows[0]?.tokens ?? 0)
}
