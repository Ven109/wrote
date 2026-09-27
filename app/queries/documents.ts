import { defineQueryOptions } from '@pinia/colada'
import type { EntryDocument } from '#shared/schemas/document'
import { bookKeys } from './keys'

export const documentQuery = defineQueryOptions(({ bookId, path }: { bookId: string, path: string }) => ({
  key: bookKeys.document(bookId, path),
  query: () => $fetch<EntryDocument>(`/api/books/${encodeURIComponent(bookId)}/document`, { query: { path } }),
  enabled: Boolean(bookId && path),
}))
