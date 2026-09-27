import { defineQueryOptions } from '@pinia/colada'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import type { CodexAppearance, CodexEntrySummary, CodexMentionTarget, CodexQuery, CodexTypeTemplate } from '#shared/schemas/codex'
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

export const codexMentionsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.codexMentions(bookId),
  query: () => $fetch<CodexMentionTarget[]>(`${base(bookId)}/mentions`),
  enabled: Boolean(bookId),
}))

export const codexAppearancesQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.codexAppearances(bookId, entryId),
  query: () => $fetch<CodexAppearance[]>(`${base(bookId)}/appears`, { query: { id: entryId } }),
  enabled: Boolean(bookId && entryId),
}))

/** Pending codex proposals from "Scan chapter" (refreshed by the `codex-proposal` SSE event). */
export const codexProposalsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.codexProposals(bookId),
  query: () => $fetch<CodexProposal[]>(`/api/books/${encodeURIComponent(bookId)}/codex/proposals`, { query: { status: 'pending' } }),
  enabled: Boolean(bookId),
}))
