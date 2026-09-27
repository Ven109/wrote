import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import type { Summary } from '#shared/schemas/summaries'
import { bookKeys } from '~/queries/keys'
import { aiSettingsQuery } from '~/queries/settings'
import { summaryQuery } from '~/queries/summaries'

/**
 * The rolling summary of the open scene, chapter or part: shown read-only, editable by the author
 * (which locks it against background updates), resettable to automatic, and usable as the synopsis.
 */
export function useSummary(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const entryId = () => document.value?.id ?? ''
  const { data: summary, status } = useQuery(() => summaryQuery({ bookId: toValue(bookId), entryId: entryId() }))
  const { data: settings } = useQuery(aiSettingsQuery)
  const { update: updateMeta } = useEntryMeta(bookId, document)
  const editing = ref(false)
  const draft = ref('')
  const url = () => `/api/books/${encodeURIComponent(toValue(bookId))}/summaries`
  const setCached = (value: Summary | null) => queryCache.setQueryData(bookKeys.entrySummary(toValue(bookId), entryId()), value)
  const onError = (title: string) => (error: unknown) => toast.add({ title, description: apiErrorMessage(error), color: 'error' })

  const save = useMutation({
    mutation: (text: string) => $fetch<Summary>(url(), { method: 'PUT', body: { entryId: entryId(), text } }),
    onSuccess: (saved) => {
      setCached(saved)
      editing.value = false
    },
    onError: onError('Could not save the summary'),
  })
  const reset = useMutation({
    mutation: () => $fetch(url(), { method: 'DELETE', query: { entryId: entryId() } }),
    onSuccess: () => setCached(null),
    onError: onError('Could not reset the summary'),
  })

  watch(entryId, () => {
    editing.value = false
  })

  return {
    summary,
    status,
    /** Only parts, chapters and scenes have summaries. */
    visible: computed(() => ['part', 'chapter', 'scene'].includes(document.value?.type ?? '')),
    /** Background summaries are switched on in the AI settings. */
    enabled: computed(() => settings.value?.summaries.enabled ?? false),
    editing,
    draft,
    saving: computed(() => save.isLoading.value || reset.isLoading.value),
    edit() {
      draft.value = summary.value?.text ?? ''
      editing.value = true
    },
    cancel() {
      editing.value = false
    },
    save: () => (draft.value.trim() ? save.mutateAsync(draft.value.trim()).catch(() => null) : null),
    reset: () => reset.mutateAsync().catch(() => null),
    /** Copies the summary into the entry's `synopsis` frontmatter (only when the author asks). */
    async useAsSynopsis() {
      if (!summary.value || !await updateMeta({ synopsis: summary.value.text })) return false
      toast.add({ title: 'Saved as synopsis', icon: 'i-lucide-file-text', color: 'success' })
      return true
    },
  }
}
