import { z } from 'zod'
import { AI_PROVIDER_IDS, AiProviderIdSchema } from '#shared/schemas/ai'
import { listModels } from '../../../ai/models'
import { loadAiConfig } from '../../../services/ai-settings'

const QuerySchema = z.object({ provider: AiProviderIdSchema.optional() })

/**
 * Suggested and (for local providers) installed models. With `?provider=` for one provider,
 * otherwise grouped for all enabled providers (model pickers).
 */
export default defineEventHandler(async (event) => {
  const { provider } = await getValidatedQuery(event, QuerySchema.parse)
  const config = await loadAiConfig(useWorkspaceDir(event))
  if (provider) return listModels(config, provider)
  const enabled = AI_PROVIDER_IDS.filter(id => config.settings.providers[id]?.enabled)
  return Promise.all(enabled.map(async id => ({ provider: id, models: await listModels(config, id) })))
})
