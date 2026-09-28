import type { LanguageModel } from 'ai'
import { getModelWithRef } from '../ai/models'

/** The configured chat model, or a 409 the client shows as "set up AI" (`ai_not_configured`). */
export async function requireChatModel(workspaceDir: string): Promise<{ model: LanguageModel, ref: string }> {
  const configured = await getModelWithRef(workspaceDir, 'chat')
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'Set up an AI model first (AI models in the sidebar)', data: { code: 'ai_not_configured' } })
  return configured
}
