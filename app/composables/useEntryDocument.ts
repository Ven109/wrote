import { useMutation, useQuery, useQueryCache } from '@pinia/colada'
import { useEventListener } from '@vueuse/core'
import type { EntryDocument, SaveDocumentInput } from '#shared/schemas/document'
import { bodiesDiffer, toStoredBody } from '~/editor/markdown'
import { documentQuery } from '~/queries/documents'
import { bookKeys } from '~/queries/keys'

export type SaveResult = 'saved' | 'unchanged' | 'conflict' | 'error'

function resultOf(error: unknown): SaveResult {
  return (error as { statusCode?: number } | null)?.statusCode === 409 ? 'conflict' : 'error'
}

/**
 * One entry opened in the editor: the stored document, a local `draft` bound to the editor,
 * and `save()` with optimistic concurrency (`expectedHash`). External changes replace the draft
 * only while it has no unsaved edits. Unsaved edits are flushed when switching entries,
 * leaving the page or hiding the tab.
 */
export function useEntryDocument(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const params = () => ({ bookId: toValue(bookId), path: toValue(path) ?? '' })
  const endpoint = () => `/api/books/${encodeURIComponent(params().bookId)}/document`
  const { data: document, status, error, refetch } = useQuery(() => documentQuery(params()))

  const draft = ref('')
  const dirty = computed(() => Boolean(document.value) && bodiesDiffer(draft.value, document.value!.body))

  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: (input: SaveDocumentInput) => $fetch<EntryDocument>(endpoint(), { method: 'PUT', body: input }),
    onSuccess: saved => queryCache.setQueryData(bookKeys.document(params().bookId, saved.path), saved),
    onSettled: () => Promise.all([
      queryCache.invalidateQueries({ key: bookKeys.structure(params().bookId) }),
      queryCache.invalidateQueries({ key: bookKeys.links(params().bookId) }),
    ]),
  })

  async function persist(doc: EntryDocument, body: string, force = false): Promise<SaveResult> {
    try {
      await mutateAsync({ path: doc.path, body: toStoredBody(body), expectedHash: force ? undefined : doc.hash })
      return 'saved'
    }
    catch (error) {
      return resultOf(error)
    }
  }

  /** The document the draft belongs to (survives the `undefined` gap while another entry loads). */
  let loaded: EntryDocument | undefined
  watch(document, (next) => {
    if (!next) return
    const previous = loaded
    loaded = next
    const switched = next.path !== previous?.path
    if (switched && previous && bodiesDiffer(draft.value, previous.body)) void persist(previous, draft.value)
    const untouched = !previous || !bodiesDiffer(draft.value, previous.body)
    if (switched || (untouched && bodiesDiffer(draft.value, next.body))) draft.value = next.body.trimEnd()
  }, { immediate: true })

  /** Saves the draft. `force` overwrites a newer version on disk (resolving a conflict with "keep mine"). */
  async function save(options: { force?: boolean } = {}): Promise<SaveResult> {
    const current = document.value
    if (!current || !dirty.value) return 'unchanged'
    return persist(current, draft.value, options.force)
  }

  /** Discards the draft and loads the version on disk (resolving a conflict with "use theirs"). */
  async function reload() {
    const { data } = await refetch()
    if (data) draft.value = data.body.trimEnd()
  }

  /** Last-chance save that survives page unload (`keepalive`). */
  function flushOnExit() {
    const current = document.value
    if (!current || !dirty.value) return
    const body = JSON.stringify({ path: current.path, body: toStoredBody(draft.value), expectedHash: current.hash })
    void fetch(endpoint(), { method: 'PUT', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
  }

  if (import.meta.client) {
    useEventListener(window, 'pagehide', flushOnExit)
    useEventListener(window.document, 'visibilitychange', () => {
      if (window.document.visibilityState === 'hidden') flushOnExit()
    })
  }
  onScopeDispose(flushOnExit)

  return { document, status, error, draft, dirty, saving, save, reload }
}
