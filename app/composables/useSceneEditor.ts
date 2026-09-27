/** Everything the write page needs for one entry: document + autosave + word counts + metadata + links + summary. */
export function useSceneEditor(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const entry = useEntryDocument(bookId, path)
  const autosave = useAutosave(entry)
  const words = useWordCounts(bookId, () => entry.document.value?.id, entry.draft)
  const meta = useSceneMeta(bookId, entry.document, autosave.flush)
  const links = useWikiLinks(bookId, entry.draft)
  useCodexMentions(bookId)
  const { backlinks } = useBacklinks(bookId, () => entry.document.value?.id)
  const summary = useSummary(bookId, entry.document)
  const suggestions = useSuggestions(bookId, entry.document)
  const ai = useInlineAi(bookId, entry.document, autosave.flush)
  useAutocomplete(bookId, entry.document)
  return { entry, autosave, words, meta, links, backlinks, summary, suggestions, ai }
}
