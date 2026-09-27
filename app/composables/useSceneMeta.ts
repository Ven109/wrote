import { useMutation, useQueryCache } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { bookKeys } from '~/queries/keys'
import { metaFormFrom, metaPatchFrom, type SceneMetaForm } from '~/utils/scene-meta'

/**
 * Scene metadata panel: a form copied from the document's frontmatter and saved as a patch.
 * `beforeSave` lets the caller flush pending body edits first so both writes don't conflict.
 */
export function useSceneMeta(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>, beforeSave?: () => Promise<void>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const open = ref(false)
  const form = ref<SceneMetaForm>(metaFormFrom({}))

  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: (input: { path: string, form: SceneMetaForm }) =>
      $fetch<EntryDocument>(`/api/books/${encodeURIComponent(toValue(bookId))}/document`, {
        method: 'PATCH',
        body: { path: input.path, meta: metaPatchFrom(input.form) },
      }),
    onSuccess: saved => queryCache.setQueryData(bookKeys.document(toValue(bookId), saved.path), saved),
    onError: error => toast.add({ title: 'Could not save scene details', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => queryCache.invalidateQueries({ key: bookKeys.structure(toValue(bookId)) }),
  })

  function show() {
    if (document.value) form.value = metaFormFrom(document.value.frontmatter)
    open.value = true
  }

  async function save() {
    const current = document.value
    if (!current) return
    await beforeSave?.()
    await mutateAsync({ path: current.path, form: form.value })
    open.value = false
  }

  return { open, form, saving, show, save }
}
