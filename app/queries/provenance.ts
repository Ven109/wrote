import { defineQueryOptions } from '@pinia/colada'
import type { EntryProvenance, ProvenanceStats } from '#shared/schemas/provenance'
import { bookKeys } from './keys'

/** AI-assisted passages of one entry (refreshed with the book on file changes). */
export const entryProvenanceQuery = defineQueryOptions(({ bookId, entryId }: { bookId: string, entryId: string }) => ({
  key: bookKeys.entryProvenance(bookId, entryId),
  query: () => $fetch<EntryProvenance>(`/api/books/${encodeURIComponent(bookId)}/provenance`, { query: { entryId } }),
  enabled: Boolean(bookId && entryId),
}))

/** AI-assisted share per scene, chapter, part and for the book. */
export const provenanceStatsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.provenanceStats(bookId),
  query: () => $fetch<{ book: ProvenanceStats, entries: Record<string, ProvenanceStats> }>(`/api/books/${encodeURIComponent(bookId)}/provenance/stats`),
  enabled: Boolean(bookId),
}))
