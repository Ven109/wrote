import { UpdateAiSettingsSchema } from '#shared/schemas/ai'
import { updateAiSettings } from '../../../services/ai-settings'

/** Updates providers, default models and (write-only) API keys. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, UpdateAiSettingsSchema.parse)
  return updateAiSettings(useWorkspaceDir(event), input)
})
