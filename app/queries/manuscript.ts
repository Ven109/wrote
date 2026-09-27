import { defineQueryOptions } from '@pinia/colada'
import type { StructureNode } from '#shared/schemas/manuscript'
import { bookKeys } from './keys'

export const structureQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.structure(bookId),
  query: () => $fetch<StructureNode[]>(`/api/books/${encodeURIComponent(bookId)}/structure`),
}))
