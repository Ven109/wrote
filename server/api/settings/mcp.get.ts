import { ensureMcpToken } from '../../services/mcp-auth'

/** Connection details for MCP clients (local app only). */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  return { url: `${url.protocol}//${url.host}/mcp`, token: await ensureMcpToken(useWorkspaceDir(event)) }
})
