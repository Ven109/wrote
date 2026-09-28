import type { UIMessage } from 'ai'
import { ChatRequestSchema } from '#shared/schemas/chat'
import { getModelWithRef } from '../../../../ai/models'
import { getThread } from '../../../../db/state/chat'
import { mentionedAgentId, streamAssistant } from '../../../../services/assistant'
import { listReviewAgents } from '../../../../services/review-agents'
import { assistantPolicy } from '../../../../services/mcp-clients'

/** Streams an assistant reply (AI SDK UI message stream) for a thread. Aborts when the client disconnects. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, ChatRequestSchema.parse)
  const book = await requireBook(event)
  if (!await getThread(book.state, input.threadId)) throw createError({ statusCode: 404, statusMessage: 'Thread not found', data: { code: 'not_found' } })
  const workspaceDir = useWorkspaceDir(event)
  const messages = input.messages as unknown as UIMessage[]
  // "@agent-id …" hands this turn to a review agent: its instructions and its model slot (chat if unset).
  const mention = mentionedAgentId(messages)
  const agent = mention ? (await listReviewAgents(book)).find(candidate => candidate.id === mention) : undefined
  const configured = (agent ? await getModelWithRef(workspaceDir, agent.task) : null) ?? await getModelWithRef(workspaceDir, 'chat')
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'No AI model is configured', data: { code: 'ai_not_configured' } })

  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())
  return streamAssistant({ book, workspaceDir, model: configured.model, modelRef: configured.ref, policy: await assistantPolicy(workspaceDir), threadId: input.threadId, messages, context: input.context, agent, abortSignal: controller.signal })
})
