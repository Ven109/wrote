import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { createWroteMcpServer } from '../mcp/server'
import { checkMcpAccess } from '../services/mcp-auth'
import { authenticateMcpClient } from '../services/mcp-clients'

/**
 * MCP over Streamable HTTP (stateless: one server per request). Local only; each client authenticates with
 * its own token, which decides its name (attribution) and its policy (what it may do without asking).
 * Clients: Claude Code, Claude Desktop, Cursor, MCP Inspector – see docs/mcp.md.
 */
export default defineEventHandler(async (event) => {
  const workspaceDir = useWorkspaceDir(event)
  const access = checkMcpAccess({ origin: getHeader(event, 'origin'), host: getHeader(event, 'host') })
  if (!access.ok) throw createError({ statusCode: access.status, statusMessage: access.message })
  const client = await authenticateMcpClient(workspaceDir, getHeader(event, 'authorization'))
  if (!client) throw createError({ statusCode: 401, statusMessage: 'Missing or invalid MCP token' })

  const body = event.method === 'POST' ? await readBody(event) : undefined
  const server = createWroteMcpServer({ workspaceDir, caller: { kind: 'mcp', name: client.name }, policy: client.policy, approvals: true })
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
  event.node.res.on('close', () => {
    void transport.close()
    void server.close()
  })
  await server.connect(transport)
  await transport.handleRequest(event.node.req, event.node.res, body)
})
