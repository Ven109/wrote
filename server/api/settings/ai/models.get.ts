import { z } from 'zod'
import { AI_PROVIDER_IDS, AiProviderIdSchema, ModelPurposeSchema } from '#shared/schemas/ai'
import { listModels } from '../../../ai/models'
import { loadAiConfig } from '../../../services/ai-settings'

const QuerySchema = z.object({ provider: AiProviderIdSchema.optional(), purpose: ModelPurposeSchema.default('language') })

/**
 * Suggested and (for local providers) installed models, for chat (`purpose=language`) or embeddings. With `?provider=` for one provider,
 * otherwise grouped for all enabled providers (model pickers).
 */
export default defineEventHandler(async (event) => {
  const { provider, purpose } = await getValidatedQuery(event, QuerySchema.parse)
  const config = await loadAiConfig(useWorkspaceDir(event))
  if (provider) return listModels(config, provider, fetch, purpose)
  const enabled = AI_PROVIDER_IDS.filter(id => config.settings.providers[id]?.enabled)
  return Promise.all(enabled.map(async id => ({ provider: id, models: await listModels(config, id, fetch, purpose) })))
})
