import { CreateMcpClientSchema } from '#shared/schemas/permissions'
import { createMcpClient } from '../../../services/mcp-clients'

/** Creates an MCP client; its token is in the response once and cannot be shown again. */
export default defineEventHandler(async (event) => {
  const input = await readValidatedBody(event, CreateMcpClientSchema.parse)
  setResponseStatus(event, 201)
  return createMcpClient(useWorkspaceDir(event), input)
})
