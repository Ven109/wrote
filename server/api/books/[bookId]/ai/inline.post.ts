import { InlineAiRequestSchema } from '#shared/schemas/inline-ai'
import { getModelWithRef } from '../../../../ai/models'
import { streamInlineAction } from '../../../../services/inline-ai'

/**
 * Runs an inline AI action on a passage and streams the text (live preview). The result becomes a pending
 * suggestion when the model finishes; the context snapshot id is in the `x-context-snapshot` header.
 */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, InlineAiRequestSchema.parse)
  const book = await requireBook(event)
  const configured = await getModelWithRef(useWorkspaceDir(event), 'chat')
  if (!configured) throw createError({ statusCode: 409, statusMessage: 'No AI model is configured', data: { code: 'ai_not_configured' } })
  const controller = new AbortController()
  event.node.req.on('close', () => controller.abort())
  return withStorageErrors(() => streamInlineAction(book, input, configured, { abortSignal: controller.signal }))
})
