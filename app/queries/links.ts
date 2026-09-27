import { defineQueryOptions } from '@pinia/colada'
import type { Backlink, LinkRef } from '#shared/schemas/links'
import { bookKeys } from './keys'

const base = (bookId: string) => `/api/books/${encodeURIComponent(bookId)}`

export const linkTargetsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.linkTargets(bookId),
  query: () => $fetch<LinkRef[]>(`${base(bookId)}/links/targets`),
  enabled: Boolean(bookId),
}))

/** `targets` must be sorted and unique so equal sets share a cache entry. */
export const resolvedLinksQuery = defineQueryOptions(({ bookId, targets }: { bookId: string, targets: string[] }) => ({
  key: bookKeys.resolvedLinks(bookId, targets),
  query: () => $fetch<Record<string, LinkRef | null>>(`${base(bookId)}/links/resolve`, { query: { targets } }),
  enabled: Boolean(bookId) && targets.length > 0,
}))

export const entryLinksQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.entryLinks(bookId, entryId),
  query: () => $fetch<{ backlinks: Backlink[], outgoing: LinkRef[], unresolved: string[] }>(`${base(bookId)}/entries/${entryId}/links`),
  enabled: Boolean(bookId && entryId),
}))
