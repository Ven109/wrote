import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import type { Job } from '#shared/schemas/jobs'
import { openStateDb, type StateDb } from '../db/state/client'
import { defineWroteJob } from '../jobs/define'
import { createJobRunner, type JobRunner } from './jobs'
import type { BookContext } from './workspace'

let db: StateDb
let runner: JobRunner | undefined
let events: Job[]

const book = {} as BookContext
const gate = () => {
  let open!: () => void
  const promise = new Promise<void>(resolve => (open = resolve))
  return { promise, open }
}

function start(jobs: Parameters<typeof createJobRunner>[0]['jobs'], backoffMs = () => 0) {
  runner = createJobRunner({ db, jobs, book: () => book, publish: job => events.push(job), backoffMs })
  return runner
}

beforeEach(async () => {
  db = await openStateDb(':memory:')
  events = []
})
afterEach(async () => {
  await runner?.stop()
  runner = undefined
  db.$client.close()
})

describe('job runner', () => {
  it('runs a job, streams progress and stores the result', async () => {
    const r = start([defineWroteJob({
      kind: 'count',
      title: 'Count',
      input: z.object({ to: z.number() }),
      async run({ input, progress }) {
        for (let i = 1; i <= input.to; i++) await progress(i / input.to, `${i}`)
        return { counted: input.to }
      },
    })])
    const job = await r.enqueue('count', { to: 2 })
    await r.idle()
    expect(await r.get(job.id)).toMatchObject({ status: 'succeeded', progress: 1, result: { counted: 2 } })
    expect(events.map(e => [e.status, e.progress])).toEqual([['queued', 0], ['running', 0], ['running', 0.5], ['running', 1], ['succeeded', 1]])
  })

  it('validates input and kind', async () => {
    const r = start([defineWroteJob({ kind: 'k', title: 'K', input: z.object({ n: z.number() }), run: async () => null })])
    await expect(r.enqueue('k', { n: 'x' })).rejects.toThrow()
    await expect(r.enqueue('nope')).rejects.toMatchObject({ code: 'invalid_input' })
  })

  it('limits concurrency per kind', async () => {
    const hold = gate()
    let concurrent = 0
    let peak = 0
    const r = start([defineWroteJob({
      kind: 'slow',
      title: 'Slow',
      input: z.null().optional(),
      concurrency: 2,
      async run() {
        peak = Math.max(peak, ++concurrent)
        await hold.promise
        concurrent--
      },
    })])
    await Promise.all([r.enqueue('slow'), r.enqueue('slow'), r.enqueue('slow')])
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(peak).toBe(2)
    hold.open()
    await r.idle()
    expect((await r.list()).every(job => job.status === 'succeeded')).toBe(true)
  })

  it('retries failures with backoff, then fails for good', async () => {
    let calls = 0
    const r = start([defineWroteJob({
      kind: 'flaky',
      title: 'Flaky',
      input: z.null().optional(),
      maxAttempts: 2,
      async run() {
        calls++
        throw new Error(`attempt ${calls}`)
      },
    })])
    const job = await r.enqueue('flaky')
    await r.idle()
    await new Promise(resolve => setTimeout(resolve, 20))
    await r.idle()
    expect(calls).toBe(2)
    expect(await r.get(job.id)).toMatchObject({ status: 'failed', error: 'attempt 2', attempts: 2 })
  })

  it('cancels queued and running jobs', async () => {
    const r = start([defineWroteJob({
      kind: 'wait',
      title: 'Wait',
      input: z.null().optional(),
      run: ({ signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason))),
    })])
    const first = await r.enqueue('wait')
    const second = await r.enqueue('wait')
    await new Promise(resolve => setTimeout(resolve, 10))
    expect((await r.cancel(second.id)).status).toBe('cancelled')
    expect((await r.cancel(first.id)).status).toBe('cancelled')
    await expect(r.cancel('job_missing')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('re-queues jobs interrupted by a shutdown and resumes them on start', async () => {
    let runs = 0
    const job = defineWroteJob({
      kind: 'resumable',
      title: 'Resumable',
      input: z.null().optional(),
      run: ({ signal }) => {
        runs++
        if (runs > 1) return Promise.resolve('done')
        return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason)))
      },
    })
    const first = start([job])
    const queued = await first.enqueue('resumable')
    await new Promise(resolve => setTimeout(resolve, 10))
    await first.stop()
    expect((await first.get(queued.id))?.status).toBe('running')

    const second = start([job])
    await second.start()
    await second.idle()
    expect(await second.get(queued.id)).toMatchObject({ status: 'succeeded', result: 'done', attempts: 2 })
  })
})
