import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openStateDb, type StateDb } from './client'
import { cancelQueuedJob, claimJob, finishJob, getJob, insertJob, jobInput, listJobs, nextRunAfter, requeueInterrupted, retryJob, setProgress } from './jobs'

let db: StateDb
const t = (seconds: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, seconds))

beforeEach(async () => {
  db = await openStateDb(':memory:')
})
afterEach(() => db.$client.close())

describe('job store', () => {
  it('enqueues and claims the oldest due job of a kind, once', async () => {
    const a = await insertJob(db, { kind: 'x', input: { n: 1 }, maxAttempts: 3 }, t(0))
    await insertJob(db, { kind: 'x', input: { n: 2 }, maxAttempts: 3 }, t(1))
    await insertJob(db, { kind: 'y', input: null, maxAttempts: 3 }, t(0))
    const claimed = await claimJob(db, ['x'], t(2))
    expect(claimed).toMatchObject({ id: a.id, status: 'running', attempts: 1 })
    expect(await jobInput(db, a.id)).toEqual({ n: 1 })
    expect((await claimJob(db, ['x'], t(2)))?.id).not.toBe(a.id)
    expect(await claimJob(db, ['x'], t(2))).toBeNull()
    expect(await claimJob(db, [], t(2))).toBeNull()
  })

  it('tracks progress and completion', async () => {
    const job = await insertJob(db, { kind: 'x', input: null, maxAttempts: 1 }, t(0))
    await claimJob(db, ['x'], t(0))
    expect(await setProgress(db, job.id, 1.5, 'almost')).toMatchObject({ progress: 1, message: 'almost' })
    expect(await finishJob(db, job.id, { status: 'succeeded', result: { ok: true } }, t(5))).toMatchObject({ status: 'succeeded', result: { ok: true }, finishedAt: t(5).toISOString() })
    expect(await setProgress(db, job.id, 0.2, null)).toBeNull()
  })

  it('retries with a delay and reports when to wake up', async () => {
    const job = await insertJob(db, { kind: 'x', input: null, maxAttempts: 3 }, t(0))
    await claimJob(db, ['x'], t(0))
    await retryJob(db, job.id, 'boom', t(30))
    expect(await claimJob(db, ['x'], t(10))).toBeNull()
    expect(await nextRunAfter(db, ['x'])).toEqual(t(30))
    expect(await claimJob(db, ['x'], t(30))).toMatchObject({ attempts: 2 })
  })

  it('cancels queued jobs only and re-queues interrupted ones', async () => {
    const queued = await insertJob(db, { kind: 'x', input: null, maxAttempts: 1 }, t(0))
    expect(await cancelQueuedJob(db, queued.id, t(1))).toMatchObject({ status: 'cancelled' })
    const running = await insertJob(db, { kind: 'x', input: null, maxAttempts: 1 }, t(2))
    await claimJob(db, ['x'], t(2))
    expect(await cancelQueuedJob(db, running.id, t(3))).toBeNull()
    expect(await requeueInterrupted(db)).toBe(1)
    expect((await getJob(db, running.id))?.status).toBe('queued')
  })

  it('lists active jobs and recent finished ones, newest first', async () => {
    const old = await insertJob(db, { kind: 'x', input: null, maxAttempts: 1 }, t(0))
    await finishJob(db, old.id, { status: 'failed', error: 'no' }, t(1))
    const active = await insertJob(db, { kind: 'x', input: null, maxAttempts: 1 }, t(2))
    expect((await listJobs(db)).map(job => job.id)).toEqual([active.id, old.id])
    expect(await listJobs(db, 0)).toHaveLength(1)
  })
})
