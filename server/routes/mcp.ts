import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createWroteMcpServer } from '../mcp/server'
import { checkMcpAccess, ensureMcpToken } from '../services/mcp-auth'

/**
 * MCP over Streamable HTTP (stateless: one server per request). Local only, bearer-token protected.
 * Clients: Claude Code, Claude Desktop, Cursor, MCP Inspector – see docs/mcp.md.
 */
export default defineEventHandler(async (event) => {
  const workspaceDir = useWorkspaceDir(event)
  const access = checkMcpAccess({
    authorization: getHeader(event, 'authorization'),
    origin: getHeader(event, 'origin'),
    host: getHeader(event, 'host'),
  }, await ensureMcpToken(workspaceDir))
  if (!access.ok) throw createError({ statusCode: access.status, statusMessage: access.message })

  const body = event.method === 'POST' ? await readBody(event) : undefined
  const server = createWroteMcpServer({ workspaceDir, caller: { kind: 'mcp', name: 'MCP client' } })
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  event.node.res.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(event.node.req, event.node.res, body)
})
