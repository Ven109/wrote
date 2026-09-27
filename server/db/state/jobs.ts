import type { Job, JobStatus } from '#shared/schemas/jobs'
import { createRecordId } from '#shared/utils/ids'
import type { StateDb } from './client'

type Row = Record<string, unknown>

const parse = (value: unknown) => (value === null || value === undefined ? null : JSON.parse(String(value)))

function toJob(row: Row): Job {
  return {
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.kind),
    status: String(row.status) as JobStatus,
    progress: Number(row.progress),
    message: row.message === null ? null : String(row.message),
    error: row.error === null ? null : String(row.error),
    result: parse(row.result),
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    createdAt: String(row.created_at),
    startedAt: row.started_at === null ? null : String(row.started_at),
    finishedAt: row.finished_at === null ? null : String(row.finished_at),
  }
}

async function one(db: StateDb, sql: string, args: (string | number | null)[]): Promise<Job | null> {
  const result = await db.$client.execute({ sql, args })
  return result.rows[0] ? toJob(result.rows[0] as Row) : null
}

export async function insertJob(db: StateDb, input: { kind: string, input: unknown, maxAttempts: number, runAfter?: Date }, now: Date): Promise<Job> {
  const at = now.toISOString()
  return (await one(db, `INSERT INTO jobs (id, kind, status, input, max_attempts, run_after, created_at)
    VALUES (?, ?, 'queued', ?, ?, ?, ?) RETURNING *`, [createRecordId('job'), input.kind, JSON.stringify(input.input ?? null), input.maxAttempts, (input.runAfter ?? now).toISOString(), at]))!
}

/** A queued (not yet running) job of `kind` with exactly this input – for unique enqueueing. */
export async function findQueuedJob(db: StateDb, kind: string, input: unknown): Promise<Job | null> {
  return one(db, `SELECT * FROM jobs WHERE status = 'queued' AND kind = ? AND input = ? ORDER BY created_at LIMIT 1`, [kind, JSON.stringify(input ?? null)])
}

export async function getJob(db: StateDb, id: string): Promise<Job | null> {
  return one(db, 'SELECT * FROM jobs WHERE id = ?', [id])
}

export async function jobInput(db: StateDb, id: string): Promise<unknown> {
  const result = await db.$client.execute({ sql: 'SELECT input FROM jobs WHERE id = ?', args: [id] })
  return parse(result.rows[0]?.input)
}

/** Atomically claims the oldest due queued job of one of `kinds` and marks it running. */
export async function claimJob(db: StateDb, kinds: string[], now: Date): Promise<Job | null> {
  if (!kinds.length) return null
  const at = now.toISOString()
  return one(db, `UPDATE jobs SET status = 'running', started_at = ?, attempts = attempts + 1, error = NULL
    WHERE id = (SELECT id FROM jobs WHERE status = 'queued' AND run_after <= ? AND kind IN (${kinds.map(() => '?').join(', ')})
      ORDER BY run_after, created_at LIMIT 1)
    RETURNING *`, [at, at, ...kinds])
}

export async function setProgress(db: StateDb, id: string, progress: number, message: string | null): Promise<Job | null> {
  return one(db, `UPDATE jobs SET progress = ?, message = ? WHERE id = ? AND status = 'running' RETURNING *`, [Math.min(1, Math.max(0, progress)), message, id])
}

export async function finishJob(db: StateDb, id: string, outcome: { status: 'succeeded' | 'failed' | 'cancelled', result?: unknown, error?: string }, now: Date): Promise<Job | null> {
  const progress = outcome.status === 'succeeded' ? 1 : null
  return one(db, `UPDATE jobs SET status = ?, result = ?, error = ?, finished_at = ?, progress = COALESCE(?, progress)
    WHERE id = ? RETURNING *`, [outcome.status, outcome.result === undefined ? null : JSON.stringify(outcome.result), outcome.error ?? null, now.toISOString(), progress, id])
}

/** Puts a failed attempt back in the queue to run after `runAfter`. */
export async function retryJob(db: StateDb, id: string, error: string, runAfter: Date): Promise<Job | null> {
  return one(db, `UPDATE jobs SET status = 'queued', error = ?, run_after = ? WHERE id = ? RETURNING *`, [error, runAfter.toISOString(), id])
}

/** Cancels a queued job (running jobs are cancelled through their AbortSignal). */
export async function cancelQueuedJob(db: StateDb, id: string, now: Date): Promise<Job | null> {
  return one(db, `UPDATE jobs SET status = 'cancelled', finished_at = ? WHERE id = ? AND status = 'queued' RETURNING *`, [now.toISOString(), id])
}

/** After a restart, jobs left `running` are re-queued (their worker died with the process). */
export async function requeueInterrupted(db: StateDb): Promise<number> {
  const result = await db.$client.execute(`UPDATE jobs SET status = 'queued', started_at = NULL WHERE status = 'running'`)
  return result.rowsAffected
}

/** Earliest `run_after` of queued jobs (to wake up for delayed retries). */
export async function nextRunAfter(db: StateDb, kinds: string[]): Promise<Date | null> {
  if (!kinds.length) return null
  const result = await db.$client.execute({ sql: `SELECT MIN(run_after) AS at FROM jobs WHERE status = 'queued' AND kind IN (${kinds.map(() => '?').join(', ')})`, args: kinds })
  const at = result.rows[0]?.at
  return at ? new Date(String(at)) : null
}

/** Active jobs plus the most recently finished ones. */
export async function listJobs(db: StateDb, limit = 20): Promise<Job[]> {
  const result = await db.$client.execute({
    sql: `SELECT * FROM jobs WHERE status IN ('queued', 'running')
          UNION ALL SELECT * FROM (SELECT * FROM jobs WHERE status NOT IN ('queued', 'running') ORDER BY finished_at DESC LIMIT ?)
          ORDER BY created_at DESC`,
    args: [limit],
  })
  return result.rows.map(row => toJob(row as Row))
}
