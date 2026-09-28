import { z } from 'zod'
import { AgentIdSchema } from '#shared/schemas/review'
import { deleteCustomAgent } from '../../../../../services/review-agents'

const ParamsSchema = z.object({ agentId: AgentIdSchema })

/** Deletes a custom agent's file (a customised built-in falls back to the original). */
export default defineEventHandler(async (event) => {
  const { agentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const book = await requireBook(event)
  await withStorageErrors(() => deleteCustomAgent(book, agentId))
  setResponseStatus(event, 204)
})
