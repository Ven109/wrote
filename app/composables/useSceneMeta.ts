import type { EntryDocument } from '#shared/schemas/document'
import { metaFormFrom, metaPatchFrom, type SceneMetaForm } from '~/utils/scene-meta'

/**
 * Scene details panel: a form copied from the document's frontmatter and saved as a patch.
 * `beforeSave` lets the caller flush pending body edits first so both writes don't conflict.
 */
export function useSceneMeta(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>, beforeSave?: () => Promise<void>) {
  const { update, saving } = useEntryMeta(bookId, document)
  const open = ref(false)
  const form = ref<SceneMetaForm>(metaFormFrom({}))

  function show() {
    if (document.value) form.value = metaFormFrom(document.value.frontmatter)
    open.value = true
  }

  async function save() {
    await beforeSave?.()
    if (await update(metaPatchFrom(form.value))) open.value = false
  }

  return { open, form, saving, show, save }
}
