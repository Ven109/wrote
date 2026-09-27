import { useQueryCache } from '@pinia/colada'
import { bookKeys } from '~/queries/keys'

/**
 * Keeps all cached data of the open book fresh: every file change pushed over SSE
 * (external edits, MCP clients, other tabs) invalidates that book's queries.
 */
export function useBookSync(bookId: MaybeRefOrGetter<string | null>) {
  const queryCache = useQueryCache()
  useBookEvents(bookId, () => {
    const id = toValue(bookId)
    if (!id) return
    void queryCache.invalidateQueries({ key: bookKeys.book(id) })
    void queryCache.invalidateQueries({ key: bookKeys.list() })
  })
}
