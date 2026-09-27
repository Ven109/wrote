import { defineQueryOptions } from '@pinia/colada'
import type { Job } from '#shared/schemas/jobs'
import { bookKeys } from './keys'

export const jobsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.jobs(bookId),
  query: () => $fetch<Job[]>(`/api/books/${encodeURIComponent(bookId)}/jobs`),
  enabled: Boolean(bookId),
}))
