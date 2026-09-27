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
  const queue = useSaveQueue()
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
        void queryCache.invalidateQueries({ key: bookKeys.links(bookId) })
        // Mentions/"appears in" depend on scene text and codex names.
        void queryCache.invalidateQueries({ key: bookKeys.codex(bookId) })
      }
    })
  }

  /**
   * Runs another write to the same file (frontmatter: title, tags, codex fields, …) in the document's queue,
   * so it never races a body save, and confirms the version it produced.
   */
  function mutate(bookId: string, path: string, write: () => Promise<EntryDocument>): Promise<EntryDocument> {
    const key = keyOf(bookId, path)
    return queue.enqueue(key, baseBody(bookId, path) ?? '', async () => {
      const saved = await write()
      confirm(bookId, saved)
      queryCache.setQueryData(bookKeys.document(bookId, path), saved)
      return saved
    })
  }

  return {
    confirm,
    mutate,
    baseBody,
    persist,
    confirmedHash: (bookId: string, path: string) => confirmed.get(keyOf(bookId, path))?.hash,
    isSeen: (hash: string) => seen.has(hash),
    isSaving: (bookId: string, path: string) => queue.isPending(keyOf(bookId, path)),
  }
})
