import { defineQueryOptions } from '@pinia/colada'
import type { CodexEntrySummary, CodexQuery, CodexTypeTemplate } from '#shared/schemas/codex'
import { bookKeys } from './keys'

const base = (bookId: string) => `/api/books/${encodeURIComponent(bookId)}/codex`

export const codexListQuery = defineQueryOptions(({ bookId, query }: { bookId: string, query: CodexQuery }) => ({
  key: bookKeys.codexList(bookId, query),
  query: () => $fetch<CodexEntrySummary[]>(base(bookId), { query }),
  enabled: Boolean(bookId),
}))

export const codexTypesQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.codexTypes(bookId),
  query: () => $fetch<{ types: CodexTypeTemplate[], errors: { file: string, message: string }[] }>(`${base(bookId)}/types`),
  enabled: Boolean(bookId),
}))
