/** One codex entry: description (body) with autosave, template fields + aliases, title, links and backlinks. */
export function useCodexEntry(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const entry = useEntryDocument(bookId, path)
  const autosave = useAutosave(entry)
  const { typeOf } = useCodexTypes(bookId)
  const template = computed(() => typeOf(entry.document.value?.frontmatter.codexType as string | undefined))
  const fields = useCodexFields(bookId, entry.document, template)
  const { update } = useEntryMeta(bookId, entry.document)
  useWikiLinks(bookId, entry.draft)
  const { backlinks } = useBacklinks(bookId, () => entry.document.value?.id)

  let renaming: string | null = null
  async function rename(next: string) {
    const title = next.trim()
    if (!title || title === entry.document.value?.title || title === renaming) return
    renaming = title
    await autosave.flush()
    await update({ title }).finally(() => {
      renaming = null
    })
  }

  return { entry, autosave, template, fields, backlinks, rename }
}
