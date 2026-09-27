import { useMutation, useQueryCache } from '@pinia/colada'
import type { EntryDocument, EntryMeta } from '#shared/schemas/document'
import { bookKeys } from '~/queries/keys'

/** Patches an entry's frontmatter (title, tags, pin, scene details) and refreshes what depends on it. */
export function useEntryMeta(bookId: MaybeRefOrGetter<string>, document: Ref<EntryDocument | undefined>) {
  const queryCache = useQueryCache()
  const toast = useToast()
  const id = () => toValue(bookId)

  const { mutateAsync, isLoading: saving } = useMutation({
    mutation: (input: { path: string, meta: EntryMeta }) =>
      $fetch<EntryDocument>(`/api/books/${encodeURIComponent(id())}/document`, { method: 'PATCH', body: input }),
    onSuccess: saved => queryCache.setQueryData(bookKeys.document(id(), saved.path), saved),
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
    return mutateAsync({ path: current.path, meta }).then(() => true, () => false)
  }

  return { update, saving }
}
