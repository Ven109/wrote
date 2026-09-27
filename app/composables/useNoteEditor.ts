import type { EntryMeta } from '#shared/schemas/document'
import { BOOK_LAYOUT } from '#shared/book/layout'

/** One note in the editor: body with autosave, plus title, tags, pin and "file out of inbox". */
export function useNoteEditor(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const entry = useEntryDocument(bookId, path)
  const autosave = useAutosave(entry)
  const { update, saving: savingMeta } = useEntryMeta(bookId, entry.document)
  const { fileNote } = useNotes(bookId)

  const frontmatter = computed(() => entry.document.value?.frontmatter ?? {})
  const title = computed(() => entry.document.value?.title ?? '')
  const tags = computed(() => (Array.isArray(frontmatter.value.tags) ? frontmatter.value.tags as string[] : []))
  const pinned = computed(() => frontmatter.value.pinned === true)
  const inInbox = computed(() => entry.document.value?.path.startsWith(`${BOOK_LAYOUT.inbox}/`) ?? false)

  async function updateMeta(meta: EntryMeta) {
    await autosave.flush()
    await update(meta)
  }

  async function rename(next: string) {
    const trimmed = next.trim()
    if (trimmed && trimmed !== title.value) await updateMeta({ title: trimmed })
  }

  /** Moves the note from the inbox into `notes/` and opens it at its new path. */
  async function file() {
    const current = entry.document.value
    if (!current || !inInbox.value) return
    await autosave.flush()
    const { path: next } = await fileNote(current.path)
    await navigateTo(`/books/${toValue(bookId)}/notes/${next}`, { replace: true })
  }

  return {
    entry,
    autosave,
    title,
    tags,
    pinned,
    inInbox,
    savingMeta,
    rename,
    setTags: (next: string[]) => updateMeta({ tags: next }),
    togglePin: () => updateMeta({ pinned: !pinned.value }),
    file,
  }
}
