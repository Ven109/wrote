import type { Job } from '#shared/schemas/jobs'
import type { StateDb } from '../db/state/client'
import { cancelQueuedJob, claimJob, finishJob, getJob, insertJob, jobInput, listJobs, nextRunAfter, requeueInterrupted, retryJob, setProgress } from '../db/state/jobs'
import type { WroteJob } from '../jobs/define'
import { InvalidInputError, NotFoundError } from '../storage/errors'
import type { BookContext } from './workspace'

export interface JobRunnerOptions {
  db: StateDb
  jobs: WroteJob[]
  /** The book jobs run against (resolved lazily: the runner is created while the book opens). */
  book: () => BookContext
  publish: (job: Job) => void
  now?: () => Date
  /** Delay before retry number `attempt` (default: 2s, 4s, 8s … capped at 5 min). */
  backoffMs?: (attempt: number) => number
}

const defaultBackoff = (attempt: number) => Math.min(2 ** attempt * 1000, 5 * 60_000)
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

/**
 * In-process worker for one book's persistent job queue (`state.db`): per-kind concurrency,
 * cancellation via AbortSignal, retries with exponential backoff, and recovery after restarts.
 */
export function createJobRunner(options: JobRunnerOptions) {
  const now = options.now ?? (() => new Date())
  const backoff = options.backoffMs ?? defaultBackoff
  const definitions = new Map(options.jobs.map(job => [job.kind, job]))
  const running = new Map<string, { controller: AbortController, done: Promise<void> }>()
  const activeByKind = new Map<string, number>()
  let stopped = false
  let wakeTimer: ReturnType<typeof setTimeout> | undefined
  let ticking: Promise<void> | null = null
  let tickAgain = false

  const withTitle = (job: Job): Job => ({ ...job, title: definitions.get(job.kind)?.title ?? job.kind })
  const publish = (job: Job | null) => {
    if (job) options.publish(withTitle(job))
  }
  const freeKinds = () => [...definitions.values()].filter(job => (activeByKind.get(job.kind) ?? 0) < job.concurrency).map(job => job.kind)

  async function execute(job: Job, controller: AbortController) {
    const definition = definitions.get(job.kind)!
    try {
      const input = definition.input.parse(await jobInput(options.db, job.id))
      const progress = async (value: number, message?: string) => publish(await setProgress(options.db, job.id, value, message ?? null))
      const result = await definition.run({ input, book: options.book(), signal: controller.signal, progress, attempt: job.attempts })
      controller.signal.throwIfAborted()
      publish(await finishJob(options.db, job.id, { status: 'succeeded', result }, now()))
    }
    catch (error) {
      if (controller.signal.aborted) {
        // Shutting down: leave it `running` so the next start re-queues it. Otherwise it was cancelled.
        if (!stopped) publish(await finishJob(options.db, job.id, { status: 'cancelled' }, now()))
        return
      }
      const message = errorMessage(error)
      if (job.attempts < job.maxAttempts) publish(await retryJob(options.db, job.id, message, new Date(now().getTime() + backoff(job.attempts))))
      else publish(await finishJob(options.db, job.id, { status: 'failed', error: message }, now()))
    }
  }

  function launch(job: Job) {
    const controller = new AbortController()
    activeByKind.set(job.kind, (activeByKind.get(job.kind) ?? 0) + 1)
    publish(job)
    const done = execute(job, controller).finally(() => {
      activeByKind.set(job.kind, (activeByKind.get(job.kind) ?? 1) - 1)
      running.delete(job.id)
      if (!stopped) void tick()
    })
    running.set(job.id, { controller, done })
  }

  /** Wakes up for the next delayed retry (jobs already due start when a slot frees up). */
  async function scheduleWake() {
    clearTimeout(wakeTimer)
    const at = await nextRunAfter(options.db, [...definitions.keys()])
    const delay = at ? at.getTime() - now().getTime() : 0
    if (!stopped && at && delay > 0) wakeTimer = setTimeout(() => void tick(), Math.min(delay, 2 ** 31 - 1))
  }

  /** Starts as many due jobs as there are free slots. Concurrent calls coalesce. */
  function tick(): Promise<void> {
    if (ticking) {
      tickAgain = true
      return ticking
    }
    ticking = (async () => {
      do {
        tickAgain = false
        for (let job = await claimJob(options.db, freeKinds(), now()); job && !stopped; job = await claimJob(options.db, freeKinds(), now())) launch(job)
        await scheduleWake()
      } while (tickAgain && !stopped)
    })().finally(() => {
      ticking = null
    })
    return ticking
  }

  async function enqueue(kind: string, input?: unknown): Promise<Job> {
    const definition = definitions.get(kind)
    if (!definition) throw new InvalidInputError(`Unknown job kind "${kind}"`)
    const parsed = definition.input.parse(input)
    const job = withTitle(await insertJob(options.db, { kind, input: parsed, maxAttempts: definition.maxAttempts }, now()))
    publish(job)
    if (!stopped) void tick()
    return job
  }

  async function cancel(id: string): Promise<Job> {
    const queued = await cancelQueuedJob(options.db, id, now())
    if (queued) {
      publish(queued)
      return withTitle(queued)
    }
    const active = running.get(id)
    if (active) {
      active.controller.abort()
      await active.done
    }
    const job = await getJob(options.db, id)
    if (!job) throw new NotFoundError(`Job ${id}`)
    return withTitle(job)
  }

  return {
    enqueue,
    cancel,
    list: async () => (await listJobs(options.db)).map(withTitle),
    get: async (id: string) => {
      const job = await getJob(options.db, id)
      return job && withTitle(job)
    },
    kinds: () => [...definitions.values()].map(job => ({ kind: job.kind, title: job.title })),
    /** Re-queues jobs interrupted by a restart and starts due ones. */
    async start() {
      await requeueInterrupted(options.db)
      await tick()
    },
    /** Aborts running jobs (they are re-queued on the next start) and stops scheduling. */
    async stop() {
      stopped = true
      clearTimeout(wakeTimer)
      const active = [...running.values()]
      active.forEach(entry => entry.controller.abort())
      await Promise.allSettled([ticking, ...active.map(entry => entry.done)])
    },
    /** Resolves when no job is running (tests). */
    async idle() {
      while (ticking || running.size) await Promise.allSettled([ticking, ...[...running.values()].map(entry => entry.done)])
    },
  }
}

export type JobRunner = ReturnType<typeof createJobRunner>
