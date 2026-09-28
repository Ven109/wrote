import { defineQueryOptions } from '@pinia/colada'
import type { ExportCapabilities } from '#shared/schemas/export'
import { exportKeys } from './keys'

/** Installed export tools and the formats they allow (`fresh` re-detects, e.g. after installing Pandoc). */
export const exportCapabilitiesQuery = defineQueryOptions({
  key: exportKeys.capabilities(),
  query: () => $fetch<ExportCapabilities>('/api/export/capabilities', { query: { fresh: '1' } }),
})
