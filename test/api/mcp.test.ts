import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { createMcpToken } from '../utils/mcp-token'
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
    expect((await fetch('/mcp', { ...init, headers: { ...init.headers, authorization: 'Bearer wrote_unknown' } })).status).toBe(401)
    const token = await createMcpToken($fetch)
    const foreign = await fetch('/mcp', { ...init, headers: { ...init.headers, authorization: `Bearer ${token}`, origin: 'https://evil.example' } })
    expect(foreign.status).toBe(403)
  })

  it('calls every tool against the fixture book with the official MCP client', async () => {
    const { url: endpoint } = await $fetch<{ url: string }>('/api/settings/mcp')
    expect(endpoint).toMatch(/\/mcp$/)
    const client = await connect(await createMcpToken($fetch, 'Claude Code', { write: 'allow' }))
    const tools = (await client.listTools()).tools.map(tool => tool.name).sort()
    expect(tools).toEqual(['create_note', 'get_codex', 'get_codex_entry', 'get_progress', 'get_structure', 'get_summaries', 'list_books', 'list_suggestions', 'propose_edit', 'read_entry', 'search'])

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

  it('stores MCP proposals as pending suggestions the author resolves via the API', async () => {
    const client = await connect(await createMcpToken($fetch, 'Reviewer'))
    const proposal = await client.callTool({ name: 'propose_edit', arguments: { entryId: 'scn_themap0001', find: 'tired creases', replace: 'old creases', rationale: 'Fresher' } })
    const insert = await client.callTool({ name: 'propose_edit', arguments: { entryId: 'scn_themap0001', find: 'in the drawer', replace: 'She did not touch it.', mode: 'insert_after' } })
    const ambiguous = await client.callTool({ name: 'propose_edit', arguments: { entryId: 'scn_themap0001', find: 'the', replace: 'x' } })
    await client.close()
    expect(proposal.isError).toBeFalsy()
    expect(ambiguous.isError).toBe(true)

    type Listed = { id: string, kind: string, author: { kind: string, name: string }, stale: boolean }
    const pending = await $fetch<Listed[]>('/api/books/sample-book/suggestions', { query: { entryId: 'scn_themap0001', status: 'pending' } })
    expect(pending.map(s => [s.kind, s.author.kind, s.stale])).toEqual([['replace', 'mcp', false], ['insert', 'mcp', false]])
    const body = await $fetch<{ body: string }>('/api/books/sample-book/document', { query: { path: 'manuscript/01-part-one/01-the-harbor/02-the-map.md' } })
    expect(body.body).toContain('tired creases')
    expect(JSON.stringify(insert)).toContain('sug_')

    const resolve = (payload: unknown) => fetch('/api/books/sample-book/suggestions/resolve', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    const accepted = await (await resolve({ ids: [pending[0]!.id], status: 'accepted', text: 'worn creases' })).json()
    expect(accepted[0]).toMatchObject({ status: 'accepted', appliedText: 'worn creases' })
    expect((await resolve({ ids: [pending[0]!.id], status: 'rejected' })).status).toBe(400)
    expect((await resolve({ ids: ['sug_missing000'], status: 'rejected' })).status).toBe(404)
    expect((await resolve({ ids: [pending[1]!.id], status: 'rejected', text: 'x' })).status).toBe(400)
    expect((await resolve({ ids: [pending[1]!.id], status: 'rejected' })).status).toBe(200)
    expect(await $fetch('/api/books/sample-book/suggestions', { query: { entryId: 'scn_themap0001', status: 'pending' } })).toEqual([])
    expect((await fetch('/api/books/sample-book/suggestions?status=bogus')).status).toBe(400)
  })
})
