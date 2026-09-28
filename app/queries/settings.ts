import { defineQueryOptions } from '@pinia/colada'
import type { AiModelOption, AiProviderId, AiSettingsView, ModelPurpose } from '#shared/schemas/ai'
import type { IntegrationView } from '#shared/schemas/integrations'
import type { McpSettingsView } from '#shared/schemas/permissions'
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

/** MCP endpoint, connected clients and the assistant's policy (tokens are never returned). */
export const mcpSettingsQuery = defineQueryOptions({
  key: settingsKeys.mcp(),
  query: () => $fetch<McpSettingsView>('/api/settings/mcp'),
})

/** External MCP servers with status and tools (listing connects enabled ones). */
export const integrationsQuery = defineQueryOptions({
  key: settingsKeys.integrations(),
  query: () => $fetch<IntegrationView[]>('/api/settings/integrations'),
})
