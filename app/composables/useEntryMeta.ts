import { useMutation, useQueryCache } from '@pinia/colada'
import type { EntryDocument, EntryMeta, EntryMetaResult } from '#shared/schemas/document'
import { bookKeys } from '~/queries/keys'
import { useDocumentSessionStore } from '~/stores/document-session'

/** Patches an entry's frontmatter (title, tags, pin, scene details) and refreshes what depends on it. */
export function useEntryMeta(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const { notify } = useLinkUpdateNotice()
  const id = () => toValue(bookId)

  const session = useDocumentSessionStore()
  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: async (input: { path: string, meta: EntryMeta }) => {
      // Queued with the document's other writes (autosave) so they never race each other.
      let updatedLinks: EntryMetaResult['updatedLinks'] = []
      await session.mutate(id(), input.path, async () => {
        const result = await $fetch<EntryMetaResult>(`/api/books/${encodeURIComponent(id())}/document`, { method: 'PATCH', body: input })
        updatedLinks = result.updatedLinks
        return result
      })
      return { updatedLinks }
    },
    onSuccess: ({ updatedLinks }) => {
      // Other entries changed on disk: refresh everything of the book (open documents, links).
      if (updatedLinks.length) void queryCache.invalidateQueries({ key: bookKeys.book(id()) })
    },
    onError: error => toast.add({ title: 'Could not save details', description: apiErrorMessage(error), color: 'error' }),
    onSettled: () => Promise.all([
      queryCache.invalidateQueries({ key: bookKeys.structure(id()) }),
      queryCache.invalidateQueries({ key: bookKeys.notes(id()) }),
    ]),
  })

  /** Saves a metadata patch for the open document. Resolves `false` when it failed. */
  async function update(meta: EntryMeta): Promise<boolean> {
    const current = document.value
    if (!current) return false
    const previousTitle = current.title
    try {
      const { updatedLinks } = await mutateAsync({ path: current.path, meta })
      if (meta.title) notify(updatedLinks, () => update({ title: previousTitle }))
      return true
    }
    catch {
      return false
    }
  }

  return { update, saving }
}
