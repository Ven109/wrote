import { useQueryCache } from '@pinia/colada'
import { defineStore } from 'pinia'
import type { EntryDocument } from '#shared/schemas/document'
import { toStoredBody } from '~/editor/markdown'
import { bookKeys } from '~/queries/keys'

export type SaveResult = 'saved' | 'unchanged' | 'conflict' | 'error'

interface Version { hash: string, body: string }

function resultOf(error: unknown): SaveResult {
  return (error as { statusCode?: number } | null)?.statusCode === 409 ? 'conflict' : 'error'
}

/**
 * Editor session state that must outlive a page (pages remount on every route change):
 * the last version confirmed on disk per document, every hash seen, and a per-document save queue.
 */
export const useDocumentSessionStore = defineStore('document-session', () => {
  const queryCache = useQueryCache()
  const queue = useSaveQueue<SaveResult>()
  const confirmed = shallowReactive(new Map<string, Version>())
  const seen = new Set<string>()
  const keyOf = (bookId: string, path: string) => `${bookId}\u0000${path}`

  function confirm(bookId: string, doc: { path: string, hash: string, body: string }) {
    seen.add(doc.hash)
    confirmed.set(keyOf(bookId, doc.path), { hash: doc.hash, body: doc.body })
  }

  /** Body the editor should start from: a queued save's body, else the confirmed version. */
  function baseBody(bookId: string, path: string): string | undefined {
    const key = keyOf(bookId, path)
    return queue.pendingBody(key) ?? confirmed.get(key)?.body
  }

  function persist(bookId: string, path: string, body: string, force = false): Promise<SaveResult> {
    const key = keyOf(bookId, path)
    const stored = toStoredBody(body)
    return queue.enqueue(key, stored, async () => {
      try {
        const expectedHash = force ? undefined : confirmed.get(key)?.hash
        const saved = await $fetch<EntryDocument>(`/api/books/${encodeURIComponent(bookId)}/document`, { method: 'PUT', body: { path, body: stored, expectedHash } })
        confirm(bookId, saved)
        queryCache.setQueryData(bookKeys.document(bookId, path), saved)
        return 'saved'
      }
      catch (error) {
        return resultOf(error)
      }
      finally {
        void queryCache.invalidateQueries({ key: bookKeys.structure(bookId) })
      }
    })
  }

  return {
    confirm,
    baseBody,
    persist,
    confirmedHash: (bookId: string, path: string) => confirmed.get(keyOf(bookId, path))?.hash,
    isSeen: (hash: string) => seen.has(hash),
    isSaving: (bookId: string, path: string) => queue.isPending(keyOf(bookId, path)),
  }
})
