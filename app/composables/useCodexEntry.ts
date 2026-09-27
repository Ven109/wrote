import { useQueryCache } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { bookKeys } from '~/queries/keys'
import { useDocumentSessionStore } from '~/stores/document-session'

/** One codex entry: description (body) with autosave, template fields + aliases, title, links, backlinks and scenes it appears in. */
export function useCodexEntry(bookId: MaybeRefOrGetter<string>, path: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  const entry = useEntryDocument(bookId, path)
  const autosave = useAutosave(entry)
  const { typeOf } = useCodexTypes(bookId)
  const template = computed(() => typeOf(entry.document.value?.frontmatter.codexType as string | undefined))
  const fields = useCodexFields(bookId, entry.document, template)
  const { update } = useEntryMeta(bookId, entry.document)
  useWikiLinks(bookId, entry.draft)
  useCodexMentions(bookId)
  const { backlinks } = useBacklinks(bookId, () => entry.document.value?.id)
  const { appearances } = useCodexAppearances(bookId, () => entry.document.value?.id)

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

  const session = useDocumentSessionStore()
  const detect = computed(() => entry.document.value?.frontmatter.detect !== false)
  /** Turns automatic detection of this entry's names in prose on or off. */
  async function setDetect(value: boolean) {
    const doc = entry.document.value
    if (!doc) return
    await session.mutate(toValue(bookId), doc.path, () => $fetch<EntryDocument>(`/api/books/${encodeURIComponent(toValue(bookId))}/codex/entry`, {
      method: 'PATCH',
      body: { path: doc.path, fields: {}, detect: value },
    }))
    await queryCache.invalidateQueries({ key: bookKeys.codex(toValue(bookId)) })
  }

  return { entry, autosave, template, fields, backlinks, appearances, rename, detect, setDetect }
}
