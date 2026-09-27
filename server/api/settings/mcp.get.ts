import { mcpSettingsView } from '../../services/mcp-clients'

/** MCP endpoint, connected clients (tokens are never returned) and the assistant's policy. Local app only. */
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event)
  return mcpSettingsView(useWorkspaceDir(event), `${url.protocol}//${url.host}/mcp`)
})
