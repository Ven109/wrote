import { useQuery } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { countWords } from '#shared/utils/word-count'
import { structureQuery } from '~/queries/manuscript'
import { useWritingSessionStore } from '~/stores/writing-session'
import { liveWordCounts } from '~/utils/word-counts'

/** Live scene/chapter/book word counts for the draft being edited, plus words written this session. */
export function useWordCounts(bookId: MaybeRefOrGetter<string>, sceneId: MaybeRefOrGetter<string | undefined>, draft: Ref<string>) {
  const session = useWritingSessionStore()
  const { data: tree, status } = useQuery(() => structureQuery(toValue(bookId)))
  // Debounce timers never fire during SSR, so the server counts the draft directly (keeps hydration in sync).
  const debouncedDraft = import.meta.server ? draft : refDebounced(draft, 250)
  const counts = computed(() => liveWordCounts(tree.value ?? [], toValue(sceneId), countWords(debouncedDraft.value)))
  // The first loaded book total becomes the session baseline (kept across scenes).
  watch(() => (status.value === 'success' ? counts.value.book : null), (book) => {
    if (book !== null) session.baseline(toValue(bookId), book)
  }, { immediate: true })
  const sessionWords = computed(() => {
    const start = session.baselines[toValue(bookId)]
    return start === undefined ? 0 : counts.value.book - start
  })
  return { counts, sessionWords }
}
