import { useQueryCache } from '@pinia/colada'
import type { Job } from '#shared/schemas/jobs'
import { bookKeys } from '~/queries/keys'
import { upsertJob } from '~/utils/jobs'

/**
 * Keeps all cached data of the open book fresh from its SSE stream: file changes invalidate the
 * book's queries; job updates are written straight into the jobs cache (live progress), and a
 * finished job refreshes the book (it may have changed files or the index).
 */
export function useBookSync(bookId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const refreshBook = (id: string) => {
    void queryCache.invalidateQueries({ key: bookKeys.book(id) })
    void queryCache.invalidateQueries({ key: bookKeys.list() })
  }

  useBookEvents(bookId, {
    change: () => {
      const id = toValue(bookId)
      if (id) refreshBook(id)
    },
    job: ({ job }) => {
      const id = toValue(bookId)
      if (!id) return
      queryCache.setQueryData(bookKeys.jobs(id), upsertJob(queryCache.getQueryData<Job[]>(bookKeys.jobs(id)), job))
      if (job.status === 'succeeded') refreshBook(id)
    },
    suggestion: ({ entryId }) => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.entrySuggestions(id, entryId) })
    },
  })
}
