import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

export interface FakeOAuthMcp {
  url: string
  /** Approves the pending authorization like a user would and returns the redirect with the code. */
  approve: (authorizationUrl: string) => string
  close: () => Promise<void>
}

async function body(request: IncomingMessage): Promise<string> {
  let text = ''
  for await (const chunk of request) text += chunk
  return text
}

/**
 * A remote MCP server protected by OAuth (discovery, dynamic client registration, PKCE code flow, refresh),
 * with one `lookup` tool. Enough of the spec for the MCP SDK client flow.
 */
export async function startFakeOAuthMcp(): Promise<FakeOAuthMcp> {
  const tokens = new Set<string>()
  const codes = new Map<string, string>()
  let origin = ''
  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', origin)
    const json = (status: number, data: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' })
      response.end(JSON.stringify(data))
    }
    if (url.pathname === '/.well-known/oauth-protected-resource/mcp' || url.pathname === '/.well-known/oauth-protected-resource') return json(200, { resource: `${origin}/mcp`, authorization_servers: [origin] })
    if (url.pathname === '/.well-known/oauth-authorization-server') {
      return json(200, { issuer: origin, authorization_endpoint: `${origin}/authorize`, token_endpoint: `${origin}/token`, registration_endpoint: `${origin}/register`, response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'], code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'] })
    }
    if (url.pathname === '/register') return json(201, { ...JSON.parse(await body(request)), client_id: 'wrote-client', client_id_issued_at: 0 })
    if (url.pathname === '/token') {
      const form = new URLSearchParams(await body(request))
      if (form.get('grant_type') === 'authorization_code' && !codes.has(form.get('code') ?? '')) return json(400, { error: 'invalid_grant' })
      const token = `tok_${Math.random().toString(36).slice(2)}`
      tokens.add(token)
      return json(200, { access_token: token, token_type: 'Bearer', expires_in: 3600, refresh_token: 'refresh' })
    }
    if (url.pathname === '/mcp') {
      const auth = request.headers.authorization?.replace(/^Bearer /, '')
      if (!auth || !tokens.has(auth)) {
        response.writeHead(401, { 'www-authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource/mcp"` })
        return response.end()
      }
      const mcp = new McpServer({ name: 'fake-remote', version: '1.0.0' })
      mcp.registerTool('lookup', { title: 'Lookup', description: 'Looks up a word', inputSchema: { word: z.string() } }, async ({ word }) => ({ content: [{ type: 'text', text: `${word}: a tower with a light` }] }))
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
      response.on('close', () => void transport.close())
      await mcp.connect(transport)
      const text = request.method === 'POST' ? await body(request) : ''
      return transport.handleRequest(request, response, text ? JSON.parse(text) : undefined)
    }
    json(404, { error: 'not found' })
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    url: `${origin}/mcp`,
    approve(authorizationUrl) {
      const auth = new URL(authorizationUrl)
      const code = `code_${Math.random().toString(36).slice(2)}`
      codes.set(code, auth.searchParams.get('code_challenge') ?? '')
      const redirect = new URL(auth.searchParams.get('redirect_uri')!)
      redirect.searchParams.set('code', code)
      redirect.searchParams.set('state', auth.searchParams.get('state') ?? '')
      return redirect.toString()
    },
    close: () => new Promise((resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    }),
  }
}
