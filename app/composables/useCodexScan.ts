import { useQuery } from '@pinia/colada'
import type { Job } from '#shared/schemas/jobs'
import { structureQuery } from '~/queries/manuscript'
import { scanTargets } from '~/utils/codex-proposals'

/**
 * "Scan chapter": pick a chapter, run the extraction as a background job, and open the review list when
 * it has finished.
 */
export function useCodexScan(bookId: MaybeRefOrGetter<string>, onFinished: () => void) {
  const toast = useToast()
  const { data: structure } = useQuery(() => structureQuery(toValue(bookId)))
  const { jobs } = useJobs(bookId)
  const targets = computed(() => scanTargets(structure.value ?? []))
  const open = ref(false)
  const target = ref<string | undefined>()
  const jobId = ref<string | null>(null)
  const job = computed(() => jobs.value.find(candidate => candidate.id === jobId.value) ?? null)
  const scanning = computed(() => job.value?.status === 'queued' || job.value?.status === 'running')

  watch(() => job.value?.status, (status) => {
    if (status === 'succeeded') {
      const count = (job.value?.result as { proposals?: number } | null)?.proposals ?? 0
      toast.add({ title: count ? `${count} codex proposal${count === 1 ? '' : 's'} to review` : 'Nothing new found', color: count ? 'success' : 'neutral' })
      jobId.value = null
      if (count) onFinished()
    }
    else if (status === 'failed') {
      toast.add({ title: 'The scan failed', description: job.value?.error ?? undefined, color: 'error' })
      jobId.value = null
    }
  })

  async function start() {
    if (!target.value) return
    try {
      const started = await $fetch<Job>(`/api/books/${encodeURIComponent(toValue(bookId))}/codex/extract`, { method: 'POST', body: { entryId: target.value } })
      jobId.value = started.id
      open.value = false
    }
    catch (error) {
      toast.add({ title: 'Could not start the scan', description: apiErrorMessage(error), color: 'error' })
    }
  }

  return { open, targets, target, scanning, start }
}
