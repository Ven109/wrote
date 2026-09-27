import { z } from 'zod'

export const JOB_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]
export const ACTIVE_JOB_STATUSES: JobStatus[] = ['queued', 'running']

/** A background job as seen by clients. */
export interface Job {
  id: string
  kind: string
  /** Human-readable name of the job kind. */
  title: string
  status: JobStatus
  /** 0…1 */
  progress: number
  message: string | null
  error: string | null
  result: unknown
  attempts: number
  maxAttempts: number
  createdAt: string
  startedAt: string | null
  finishedAt: string | null
}

export const JobKindSchema = z.string().regex(/^[a-z][a-z0-9-]*$/)

export const EnqueueJobSchema = z.object({
  kind: JobKindSchema,
  input: z.unknown().optional(),
})

/** Pushed on the book event stream (SSE event `job`) whenever a job changes. */
export interface JobEvent {
  job: Job
}
