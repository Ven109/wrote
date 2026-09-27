/** Everything the write page needs for one entry: document + autosave + word counts + metadata. */
export function useSceneEditor(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const entry = useEntryDocument(bookId, path)
  const autosave = useAutosave(entry)
  const words = useWordCounts(bookId, () => entry.document.value?.id, entry.draft)
  const meta = useSceneMeta(bookId, entry.document, autosave.flush)
  return { entry, autosave, words, meta }
}
