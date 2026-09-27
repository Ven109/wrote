import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

async function connect(token: string) {
  const client = new Client({ name: 'integration-test', version: '1.0.0' })
  // The test server listens on 127.0.0.1; use a localhost URL so the Host check passes.
  await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}

const text = (result: Awaited<ReturnType<Client['callTool']>>) => (result.content as { text: string }[])[0]!.text

describe('MCP over HTTP', () => {
  it('rejects unauthenticated and cross-origin requests', async () => {
    const init = { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json, text/event-stream' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) }
    expect((await fetch('/mcp', init)).status).toBe(401)
    const { token } = await $fetch<{ token: string }>('/api/settings/mcp')
    const foreign = await fetch('/mcp', { ...init, headers: { ...init.headers, authorization: `Bearer ${token}`, origin: 'https://evil.example' } })
    expect(foreign.status).toBe(403)
  })

  it('calls every tool against the fixture book with the official MCP client', async () => {
    const { url: endpoint, token } = await $fetch<{ url: string, token: string }>('/api/settings/mcp')
    expect(endpoint).toMatch(/\/mcp$/)
    const client = await connect(token)
    const tools = (await client.listTools()).tools.map(tool => tool.name).sort()
    expect(tools).toEqual(['create_note', 'get_codex', 'get_codex_entry', 'get_progress', 'get_structure', 'list_books', 'list_suggestions', 'propose_edit', 'read_entry', 'search'])

    expect(text(await client.callTool({ name: 'list_books', arguments: {} }))).toContain('sample-book')
    expect(text(await client.callTool({ name: 'search', arguments: { query: 'harbor' } }))).toContain('Arrival')
    expect(text(await client.callTool({ name: 'read_entry', arguments: { id: 'scn_arr1val001' } }))).toContain('The tide was out')
    expect(text(await client.callTool({ name: 'get_structure', arguments: {} }))).toContain('Part One')
    expect(text(await client.callTool({ name: 'get_codex', arguments: {} }))).toContain('Mara Velden')
    expect((await client.callTool({ name: 'get_progress', arguments: {} })).isError).toBeFalsy()
    const note = await client.callTool({ name: 'create_note', arguments: { title: 'Agent note', body: 'Written via MCP.' } })
    expect(note.isError).toBeFalsy()
    const proposal = await client.callTool({ name: 'propose_edit', arguments: { entryId: 'scn_arr1val001', find: 'The tide was out', replace: 'The tide had gone out', rationale: 'Tense' } })
    expect(proposal.isError).toBeFalsy()
    expect(text(await client.callTool({ name: 'list_suggestions', arguments: {} }))).toContain('The tide had gone out')
    await client.close()

    const inbox = await $fetch<{ title: string }[]>('/api/books/sample-book/notes', { query: { filter: 'inbox' } })
    expect(inbox.map(n => n.title)).toContain('Agent note')
  })
})
