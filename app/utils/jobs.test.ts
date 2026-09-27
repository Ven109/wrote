import { describe, expect, it } from 'vitest'
import type { Job } from '#shared/schemas/jobs'
import { isActiveJob, upsertJob } from './jobs'

const job = (id: string, createdAt: string, status: Job['status'] = 'queued'): Job =>
  ({ id, kind: 'k', title: 'K', status, progress: 0, message: null, error: null, result: null, attempts: 0, maxAttempts: 1, createdAt, startedAt: null, finishedAt: null })

describe('upsertJob', () => {
  it('replaces updates in place and keeps newest first', () => {
    const list = upsertJob([job('a', '2026-01-01')], job('b', '2026-01-02'))
    expect(list.map(j => j.id)).toEqual(['b', 'a'])
    const updated = upsertJob(list, job('a', '2026-01-01', 'running'))
    expect(updated.map(j => [j.id, j.status])).toEqual([['b', 'queued'], ['a', 'running']])
    expect(upsertJob(undefined, job('x', '1'))).toHaveLength(1)
  })

  it('knows active jobs', () => {
    expect(isActiveJob(job('a', '1', 'running'))).toBe(true)
    expect(isActiveJob(job('a', '1', 'failed'))).toBe(false)
  })
})
