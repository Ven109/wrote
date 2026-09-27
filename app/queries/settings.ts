import { defineQueryOptions } from '@pinia/colada'
import type { AiModelOption, AiProviderId, AiSettingsView } from '#shared/schemas/ai'
import { settingsKeys } from './keys'

export const aiSettingsQuery = defineQueryOptions({
  key: settingsKeys.ai(),
  query: () => $fetch<AiSettingsView>('/api/settings/ai'),
})

/** Models of all enabled providers (curated + installed local ones). */
export const aiModelsQuery = defineQueryOptions({
  key: settingsKeys.aiModels(),
  query: () => $fetch<{ provider: AiProviderId, models: AiModelOption[] }[]>('/api/settings/ai/models'),
})

export const mcpSettingsQuery = defineQueryOptions({
  key: settingsKeys.mcp(),
  query: () => $fetch<{ url: string, token: string }>('/api/settings/mcp'),
})
