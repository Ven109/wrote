import { ReviewRunSchema, type ReviewRun } from '#shared/schemas/review'
import type { StateDb } from './client'

export async function upsertReviewRun(db: StateDb, run: ReviewRun): Promise<ReviewRun> {
  const parsed = ReviewRunSchema.parse(run)
  await db.$client.execute({
    sql: `INSERT INTO review_runs (id, created_at, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
    args: [parsed.id, parsed.createdAt, JSON.stringify(parsed)],
  })
  return parsed
}

export async function getReviewRun(db: StateDb, id: string): Promise<ReviewRun | null> {
  const result = await db.$client.execute({ sql: 'SELECT data FROM review_runs WHERE id = ?', args: [id] })
  return result.rows[0] ? ReviewRunSchema.parse(JSON.parse(String(result.rows[0].data))) : null
}

/** Runs, newest first; with `sceneId` only the ones that reviewed that scene. */
export async function listReviewRuns(db: StateDb, filter: { sceneId?: string, limit?: number } = {}): Promise<ReviewRun[]> {
  const result = await db.$client.execute({
    sql: `SELECT data FROM review_runs ${filter.sceneId ? `WHERE EXISTS (SELECT 1 FROM json_each(json_extract(data, '$.sceneIds')) WHERE value = ?)` : ''} ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    args: filter.sceneId ? [filter.sceneId, filter.limit ?? 50] : [filter.limit ?? 50],
  })
  return result.rows.map(row => ReviewRunSchema.parse(JSON.parse(String(row.data))))
}
