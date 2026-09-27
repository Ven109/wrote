import { z } from 'zod'
import { UpdateMcpClientSchema } from '#shared/schemas/permissions'
import { updateMcpClient } from '../../../../services/mcp-clients'

const ParamsSchema = z.object({ clientId: z.string().regex(/^mcp_[a-z0-9]+$/) })

/** Renames a client or changes its policy. */
export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const input = await readValidatedBody(event, UpdateMcpClientSchema.parse)
  return withStorageErrors(() => updateMcpClient(useWorkspaceDir(event), clientId, input))
})
