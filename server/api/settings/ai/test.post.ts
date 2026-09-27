import { TestConnectionSchema } from '#shared/schemas/ai'
import { testConnection } from '../../../ai/models'
import { loadAiConfig } from '../../../services/ai-settings'

/** Sends a tiny prompt to `model` with the saved settings and reports whether it answered. */
export default defineEventHandler(async (event) => {
  const { model } = await readValidatedBody(event, TestConnectionSchema.parse)
  return testConnection(await loadAiConfig(useWorkspaceDir(event)), model)
})
