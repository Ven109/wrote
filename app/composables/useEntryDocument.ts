import { useQuery } from '@pinia/colada'
import { useEventListener } from '@vueuse/core'
import { bodiesDiffer, toStoredBody } from '~/editor/markdown'
import { documentQuery } from '~/queries/documents'
import { useDocumentSessionStore, type SaveResult } from '~/stores/document-session'

/**
 * One entry opened in the editor: the stored document, a local `draft` bound to the editor, and `save()`
 * with optimistic concurrency. Guarantees against lost edits (state lives in the document session store,
 * so it survives page remounts):
 * - saves are queued per document and use the hash confirmed by the previous save;
 * - opening an entry with a save in flight starts from the queued body, not the stale cache;
 * - only versions with a never-seen hash count as external edits, and they replace the draft only while
 *   it has no unsaved changes (stale refetches and own writes are ignored);
 * - unsaved edits are saved when switching entries or leaving the page, and sent with `keepalive` on unload.
 */
export function useEntryDocument(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const session = useDocumentSessionStore()
  const id = () => toValue(bookId)
  const { data: document, status, error, refetch } = useQuery(() => documentQuery({ bookId: id(), path: toValue(path) ?? '' }))

  // Watchers do not run during SSR once the query resolves, so on the server the draft mirrors the loaded document.
  const draft: Ref<string> = import.meta.server
    ? computed({ get: () => document.value?.body.trimEnd() ?? '', set: () => {} })
    : ref('')
  const draftPath = ref<string | null>(null)
  const baseBody = (p: string) => session.baseBody(id(), p) ?? ''
  const dirty = computed(() => Boolean(draftPath.value) && bodiesDiffer(draft.value, baseBody(draftPath.value!)))
  const saving = computed(() => Boolean(draftPath.value) && session.isSaving(id(), draftPath.value!))

  watch(document, (next) => {
    if (!next) return
    if (next.path !== draftPath.value) {
      if (draftPath.value && dirty.value) void session.persist(id(), draftPath.value, draft.value)
      if (!session.isSeen(next.hash) && !session.isSaving(id(), next.path)) session.confirm(id(), next)
      draftPath.value = next.path
      draft.value = baseBody(next.path).trimEnd()
      return
    }
    if (session.isSeen(next.hash) || session.isSaving(id(), next.path)) return
    const untouched = !dirty.value
    session.confirm(id(), next)
    if (untouched) draft.value = next.body.trimEnd()
  }, { immediate: true })

  // After dispose (page remount) this instance's draft is stale: the dispose handler saved it once, and
  // late callers (e.g. a debounced autosave) must not save it again over newer edits.
  let disposed = false

  /** Saves the draft. `force` overwrites a newer version on disk (resolving a conflict with "keep mine"). */
  async function save(options: { force?: boolean } = {}): Promise<SaveResult> {
    if (disposed || !draftPath.value || !dirty.value) return 'unchanged'
    return session.persist(id(), draftPath.value, draft.value, options.force)
  }

  /** Discards the draft and loads the version on disk (resolving a conflict with "use theirs"). */
  async function reload() {
    const { data } = await refetch()
    if (!data) return
    session.confirm(id(), data)
    draft.value = data.body.trimEnd()
  }

  /** Last-chance save that survives page unload (`keepalive`). */
  function flushOnUnload() {
    const target = draftPath.value
    if (!target || !dirty.value) return
    const body = JSON.stringify({ path: target, body: toStoredBody(draft.value), expectedHash: session.confirmedHash(id(), target) })
    const url = `/api/books/${encodeURIComponent(id())}/document`
    void fetch(url, { method: 'PUT', body, keepalive: true, headers: { 'content-type': 'application/json' } }).catch(() => {})
  }

  if (import.meta.client) {
    useEventListener(window, 'pagehide', flushOnUnload)
    useEventListener(window.document, 'visibilitychange', () => {
      if (window.document.visibilityState === 'hidden') flushOnUnload()
    })
  }
  onScopeDispose(() => {
    if (draftPath.value && dirty.value) void session.persist(id(), draftPath.value, draft.value)
    disposed = true
  })

  return { document, status, error, draft, dirty, saving, save, reload }
}
