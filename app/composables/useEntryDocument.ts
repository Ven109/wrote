import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import type { EntryDocument, SaveDocumentInput } from '#shared/schemas/document'
import { bodiesDiffer, toStoredBody } from '~/editor/markdown'
import { documentQuery } from '~/queries/documents'
import { bookKeys } from '~/queries/keys'

/**
 * One entry opened in the editor: the stored document, a local `draft` bound to the editor,
 * and `save()` with optimistic-concurrency (`expectedHash`). External changes replace the draft
 * only while it has no unsaved edits.
 */
export function useEntryDocument(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const params = () => ({ bookId: toValue(bookId), path: toValue(path) ?? '' })
  const { data: document, status, error } = useQuery(() => documentQuery(params()))

  const draft = ref('')
  const dirty = computed(() => Boolean(document.value) && bodiesDiffer(draft.value, document.value!.body))

  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: (input: SaveDocumentInput) =>
      $fetch<EntryDocument>(`/api/books/${encodeURIComponent(params().bookId)}/document`, { method: 'PUT', body: input }),
    onSuccess: saved => queryCache.setQueryData(bookKeys.document(params().bookId, saved.path), saved),
    onError: error => toast.add({ title: 'Could not save', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.structure(params().bookId) }),
  })

  /** The document the draft belongs to (survives the `undefined` gap while another entry loads). */
  let loaded: EntryDocument | undefined
  watch(document, (next) => {
    if (!next) return
    const previous = loaded
    loaded = next
    const switched = next.path !== previous?.path
    if (switched && previous && bodiesDiffer(draft.value, previous.body)) {
      // Leaving an entry with unsaved edits: save them before the draft is replaced.
      void mutateAsync({ path: previous.path, body: toStoredBody(draft.value), expectedHash: previous.hash }).catch(() => {})
    }
    const untouched = !previous || !bodiesDiffer(draft.value, previous.body)
    if (switched || (untouched && bodiesDiffer(draft.value, next.body))) draft.value = next.body.trimEnd()
  }, { immediate: true })

  async function save() {
    const current = document.value
    if (!current || !dirty.value) return
    await mutateAsync({ path: current.path, body: toStoredBody(draft.value), expectedHash: current.hash }).catch(() => {})
  }

  return { document, status, error, draft, dirty, saving, save }
}
