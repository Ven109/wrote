import type { LanguageModel } from 'ai'
import type { AiRoute } from '#shared/schemas/ai'
import { getModelWithRef, type ModelScope } from '../ai/models'

/** The configured model for a tier or feature (default chat), or a 409 the client shows as "set up AI" (`ai_not_configured`). */
export async function requireChatModel(workspaceDir: string, route: AiRoute = 'chat', scope: ModelScope = {}): Promise<{ model: LanguageModel, ref: string }> {
  const configured = await getModelWithRef(workspaceDir, route, scope)
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'Set up an AI model first (AI models in the sidebar)', data: { code: 'ai_not_configured' } })
  return configured
}
