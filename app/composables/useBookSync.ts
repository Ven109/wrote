import { useQueryCache } from '@pinia/colada'
import type { Job } from '#shared/schemas/jobs'
import type { PendingApproval } from '#shared/schemas/permissions'
import { bookKeys, settingsKeys } from '~/queries/keys'
import { upsertJob } from '~/utils/jobs'
import { budgetMessage } from '~/utils/usage'

/**
 * Keeps all cached data of the open book fresh from its SSE stream: file changes invalidate the
 * book's queries; job updates are written straight into the jobs cache (live progress), and a
 * finished job refreshes the book (it may have changed files or the index).
 */
export function useBookSync(bookId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const refreshBook = (id: string) => {
    void queryCache.invalidateQueries({ key: bookKeys.book(id) })
    void queryCache.invalidateQueries({ key: bookKeys.list() })
  }

  useBookEvents(bookId, {
    // Changes published before the stream connected (or while it reconnected) were missed: refresh.
    ready: () => {
      const id = toValue(bookId)
      if (id) refreshBook(id)
    },
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
    approval: ({ approval, state }) => {
      const id = toValue(bookId)
      if (!id) return
      const others = (queryCache.getQueryData<PendingApproval[]>(bookKeys.approvals(id)) ?? []).filter(a => a.id !== approval.id)
      queryCache.setQueryData(bookKeys.approvals(id), state === 'pending' ? [...others, approval] : others)
    },
    activity: () => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.activity(id) })
    },
    codexProposal: () => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.codexProposals(id) })
    },
    outlineProposal: () => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.outlineProposals(id) })
    },
    comment: ({ entryId }) => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.entryComments(id, entryId) })
    },
    usage: (status) => {
      toast.add({ ...budgetMessage(status), color: status.level === 100 ? 'error' : 'warning', icon: 'i-lucide-wallet', actions: [{ label: 'Usage', to: '/settings/usage' }] })
      void queryCache.invalidateQueries({ key: settingsKeys.usage() })
    },
    suggestion: ({ entryId }) => {
      const id = toValue(bookId)
      if (id) void queryCache.invalidateQueries({ key: bookKeys.entrySuggestions(id, entryId) })
    },
  })
}
