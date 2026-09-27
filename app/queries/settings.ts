import { defineQueryOptions } from '@pinia/colada'
import type { AiModelOption, AiProviderId, AiSettingsView, ModelPurpose } from '#shared/schemas/ai'
import { settingsKeys } from './keys'

export const aiSettingsQuery = defineQueryOptions({
  key: settingsKeys.ai(),
  query: () => $fetch<AiSettingsView>('/api/settings/ai'),
})

/** Models of all enabled providers (curated + installed local ones), for chat or for embeddings. */
export const aiModelsQuery = defineQueryOptions((purpose: ModelPurpose = 'language') => ({
  key: settingsKeys.aiModels(purpose),
  query: () => $fetch<{ provider: AiProviderId, models: AiModelOption[] }[]>('/api/settings/ai/models', { query: { purpose } }),
}))

export const mcpSettingsQuery = defineQueryOptions({
  key: settingsKeys.mcp(),
  query: () => $fetch<{ url: string, token: string }>('/api/settings/mcp'),
})
