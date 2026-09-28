import { BridgeBeatsSchema } from '#shared/schemas/outline-proposals'
import { generateWith, OUTLINE_HELPER, suggestBridgeBeats } from '../../../../../services/outline-helpers'

/** Proposes 2–4 alternative beats between two beats (Wrote's chat model). The proposals also arrive over SSE. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, BridgeBeatsSchema.parse)
  const book = await requireBook(event)
  const { model, ref } = await requireChatModel(book.workspaceDir)
  return withStorageErrors(() => suggestBridgeBeats(book, input, { generate: generateWith(model), model: ref, author: OUTLINE_HELPER }))
})
