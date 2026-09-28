import { defineQueryOptions } from '@pinia/colada'
import type { ExportCapabilities } from '#shared/schemas/export'
import type { PresetList } from '#shared/schemas/export-preset'
import { bookKeys, exportKeys } from './keys'

/** Installed export tools and the formats they allow (`fresh` re-detects, e.g. after installing Pandoc). */
export const exportCapabilitiesQuery = defineQueryOptions({
  key: exportKeys.capabilities(),
  query: () => $fetch<ExportCapabilities>('/api/export/capabilities', { query: { fresh: '1' } }),
})

/** Built-in and book export presets (plus unreadable preset files). */
export const exportPresetsQuery = defineQueryOptions((bookId: string) => ({
  key: bookKeys.exportPresets(bookId),
  query: () => $fetch<PresetList>(`/api/books/${encodeURIComponent(bookId)}/export/presets`),
  enabled: Boolean(bookId),
}))
