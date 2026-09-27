import { useMutation, useQueryCache } from '@pinia/colada'
import type { CodexTypeTemplate } from '#shared/schemas/codex'
import type { EntryDocument } from '#shared/schemas/document'
import { bookKeys } from '~/queries/keys'
import { useDocumentSessionStore } from '~/stores/document-session'
import { cloneForm, fieldFormFrom, fieldPatch, type FieldForm } from '~/utils/codex-fields'

/**
 * Template fields and aliases of a codex entry as an editable form, saved (debounced) as a patch of the
 * changed keys. Writes go through the document's queue, so they never race body autosaves.
 */
export function useCodexFields(
  bookId: MaybeRefOrGetter<string>,
  document: Ref<EntryDocument | undefined>,
  template: Ref<CodexTypeTemplate | undefined>,
) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const form = ref<FieldForm>({ fields: {}, aliases: [] })
  let baseline: FieldForm = { fields: {}, aliases: [] }
  let loadedPath: string | null = null

  watch([document, template], ([doc, type]) => {
    if (!doc || !type || doc.path === loadedPath) return
    loadedPath = doc.path
    baseline = fieldFormFrom(type, doc.frontmatter)
    form.value = cloneForm(baseline)
  }, { immediate: true })

  const session = useDocumentSessionStore()
  const { mutateAsync, isLoading: saving } = useMutation({
    // Queued with the document's body saves so both writers never race (stale hash → conflict).
    mutation: (body: { path: string, fields: Record<string, unknown>, aliases?: string[] }) => session.mutate(toValue(bookId), body.path, () =>
      $fetch<EntryDocument>(`/api/books/${encodeURIComponent(toValue(bookId))}/codex/entry`, { method: 'PATCH', body })),
    onError: error => toast.add({ title: 'Could not save fields', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.codex(toValue(bookId)) }),
  })

  async function save() {
    const doc = document.value
    const type = template.value
    if (!doc || !type) return
    const patch = fieldPatch(type, baseline, form.value)
    if (!patch) return
    const snapshot = cloneForm(form.value)
    await mutateAsync({ path: doc.path, ...patch }).then(() => {
      baseline = snapshot
    }, () => {})
  }

  let timer: ReturnType<typeof setTimeout> | undefined
  watch(form, () => {
    clearTimeout(timer)
    timer = setTimeout(() => void save(), 800)
  }, { deep: true })
  onScopeDispose(() => {
    clearTimeout(timer)
    void save()
  })

  return { form, saving, save }
}
