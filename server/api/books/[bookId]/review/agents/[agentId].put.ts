import { z } from 'zod'
import { AgentIdSchema, SaveAgentSchema } from '#shared/schemas/review'
import { saveCustomAgent } from '../../../../../services/review-agents'

const ParamsSchema = z.object({ agentId: AgentIdSchema })

/** Creates or updates a custom agent (`agents/<id>.md`). Saving a built-in's id makes a customised copy. */
export default defineEventHandler(async (event) => {
  const { agentId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const agent = await readValidatedBody(event, SaveAgentSchema.parse)
  if (agent.id !== agentId) throw createError({ statusCode: 400, statusMessage: 'The agent id does not match the URL' })
  return saveCustomAgent(await requireBook(event), agent)
})
