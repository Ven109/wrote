import { z } from 'zod'
import { deleteMcpClient } from '../../../../services/mcp-clients'

const ParamsSchema = z.object({ clientId: z.string().regex(/^mcp_[a-z0-9]+$/) })

/** Revokes a client: its token stops working immediately. */
export default defineEventHandler(async (event) => {
  const { clientId } = await getValidatedRouterParams(event, ParamsSchema.parse)
  await withStorageErrors(() => deleteMcpClient(useWorkspaceDir(event), clientId))
  setResponseStatus(event, 204)
  return null
})
