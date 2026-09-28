import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { createMcpToken } from '../utils/mcp-token'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url, { env: { WROTE_AUTH_USER: 'ada', WROTE_AUTH_PASSWORD: 'lovelace' } })

const basic = (credentials: string) => `Basic ${Buffer.from(credentials).toString('base64')}`
const authed = { headers: { authorization: basic('ada:lovelace') } }

describe('basic auth (WROTE_AUTH_USER / WROTE_AUTH_PASSWORD)', () => {
  it.each(['/', '/api/books', '/mcp'])('challenges unauthenticated requests to %s', async (path) => {
    const res = await fetch(path)
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toContain('Basic realm="Wrote"')
  })

  it('rejects wrong credentials', async () => {
    expect((await fetch('/api/books', { headers: { authorization: basic('ada:nope') } })).status).toBe(401)
  })

  it('serves the app and API with the right credentials', async () => {
    expect((await fetch('/', authed)).status).toBe(200)
    const books = await $fetch<{ id: string }[]>('/api/books', authed)
    expect(books.map(book => book.id)).toContain('sample-book')
  })

  it('keeps the health check public', async () => {
    expect(await $fetch('/api/health')).toMatchObject({ status: 'ok', version: expect.any(String) })
  })

  it('leaves MCP token auth working', async () => {
    const token = await createMcpToken((path, options) => $fetch(path, { ...options, ...authed }), 'Behind auth')
    const client = new Client({ name: 'basic-auth-test', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
    expect((await client.listTools()).tools.map(tool => tool.name)).toContain('list_books')
    await client.close()
    const invalid = await fetch('/mcp', { method: 'POST', headers: { 'authorization': 'Bearer wrote_unknown', 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' }, body: '{}' })
    expect(invalid.status).toBe(401)
  })
})
