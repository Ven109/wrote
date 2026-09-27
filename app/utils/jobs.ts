import type { Job } from '#shared/schemas/jobs'

/** Inserts or replaces a job in a list (newest first), e.g. from a live SSE update. */
export function upsertJob(jobs: Job[] | undefined, job: Job): Job[] {
  const rest = (jobs ?? []).filter(existing => existing.id !== job.id)
  return [job, ...rest].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export const isActiveJob = (job: Job) => job.status === 'queued' || job.status === 'running'
