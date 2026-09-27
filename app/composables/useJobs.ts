import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { Job } from '#shared/schemas/jobs'
import { jobsQuery } from '~/queries/jobs'
import { bookKeys } from '~/queries/keys'
import { isActiveJob, upsertJob } from '~/utils/jobs'

/** Background jobs of a book: live list (updated over SSE by `useBookSync`), enqueue and cancel. */
export function useJobs(bookId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const id = () => toValue(bookId) ?? ''
  const base = () => `/api/books/${encodeURIComponent(id())}/jobs`
  const { data } = useQuery(() => jobsQuery(id()))
  const jobs = computed(() => data.value ?? [])
  const active = computed(() => jobs.value.filter(isActiveJob))
  const store = (job: Job) => queryCache.setQueryData(bookKeys.jobs(id()), upsertJob(queryCache.getQueryData<Job[]>(bookKeys.jobs(id())), job))

  const { mutateAsync: enqueue } = useMutation({
    mutation: ({ kind, input }: { kind: string, input?: unknown }) => $fetch<Job>(base(), { method: 'POST', body: { kind, input } }),
    onSuccess: store,
    onError: error => toast.add({ title: 'Could not start the job', description: apiErrorMessage(error), color: 'error' }),
  })

  const { mutateAsync: cancel } = useMutation({
    mutation: (jobId: string) => $fetch<Job>(`${base()}/${jobId}/cancel`, { method: 'POST' }),
    onSuccess: store,
    onError: error => toast.add({ title: 'Could not cancel the job', description: apiErrorMessage(error), color: 'error' }),
  })

  return {
    jobs,
    active,
    enqueue: (kind: string, input?: unknown) => enqueue({ kind, input }),
    cancel,
  }
}

/** Jobs indicator for the top bar: the jobs list plus a "Rebuild search index" command. */
export function useJobsIndicator(bookId: MaybeRefOrGetter<string | null>) {
  const jobs = useJobs(bookId)
  const { registerGroup, open } = useCommandPalette()
  registerGroup('jobs', () => ({
    id: 'jobs',
    label: 'Maintenance',
    items: toValue(bookId)
      ? [{
          label: 'Rebuild search index',
          icon: 'i-lucide-database-zap',
          onSelect: () => {
            open.value = false
            void jobs.enqueue('reindex')
          },
        }]
      : [],
  }))
  return jobs
}
