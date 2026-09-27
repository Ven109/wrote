import { UpdateAssistantPolicySchema } from '#shared/schemas/permissions'
import { updateAssistantPolicy } from '../../../services/mcp-clients'

/** Changes what the in-app assistant may do without asking. */
export default defineEventHandler(async (event) => {
  const { policy } = await readValidatedBody(event, UpdateAssistantPolicySchema.parse)
  return { assistant: await updateAssistantPolicy(useWorkspaceDir(event), policy) }
})
