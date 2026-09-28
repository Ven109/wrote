import { defineQueryOptions } from '@pinia/colada'
import type { OutlineDocument } from '#shared/schemas/outline'
import { bookKeys } from './keys'

/** The plot outline with the file hash (refreshed with the book on file changes). */
export const outlineQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.outline(bookId),
  query: () => $fetch<OutlineDocument>(`/api/books/${encodeURIComponent(bookId)}/outline`),
  enabled: Boolean(bookId),
}))
