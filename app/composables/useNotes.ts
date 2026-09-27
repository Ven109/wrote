import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import type { NoteFilter } from '#shared/schemas/notes'
import { bookKeys } from '~/queries/keys'
import { noteCountsQuery, notesQuery } from '~/queries/notes'

/** Inbox/pinned/total note counts (sidebar badge, filter chips). */
export function useNoteCounts(bookId: MaybeRefOrGetter<string | null>) {
  const { data: counts } = useQuery(() => noteCountsQuery(toValue(bookId) ?? ''))
  return { counts }
}

/** The notes list with combinable filter, tag and search-as-you-type, plus list actions. */
export function useNotes(bookId: MaybeRefOrGetter<string>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const filter = ref<NoteFilter>('all')
  const tag = ref<string | null>(null)
  const search = ref('')
  const q = refDebounced(search, 200)
  const query = computed(() => ({ filter: filter.value, tag: tag.value ?? undefined, q: q.value.trim() || undefined }))

  const { data, status } = useQuery(() => notesQuery({ bookId: toValue(bookId), query: query.value }))
  const notes = computed(() => data.value ?? [])
  const { counts } = useNoteCounts(bookId)

  const { mutateAsync: fileNote } = useMutation({
    mutation: (path: string) => $fetch<{ path: string }>(`/api/books/${encodeURIComponent(toValue(bookId))}/notes/file`, { method: 'POST', body: { path } }),
    onError: error => toast.add({ title: 'Could not file the note', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.notes(toValue(bookId)) }),
  })

  return { filter, tag, search, notes, counts, status, fileNote }
}
