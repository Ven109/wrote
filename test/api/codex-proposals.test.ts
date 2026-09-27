import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import { createMcpToken } from '../utils/mcp-token'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

const book = '/api/books/sample-book'
const post = (path: string, body: unknown) => fetch(`${book}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('codex proposals API', () => {
  it('refuses to scan without an AI model or for unknown entries', async () => {
    expect((await post('/codex/extract', { entryId: 'chp_harb0r0001' })).status).toBe(400)
    expect((await post('/codex/extract', { entryId: 'nope' })).status).toBe(400)
  })

  it('stores an agent\'s proposals for review; accepting adds the entry to the codex', async () => {
    const client = new Client({ name: 'codex-test', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${await createMcpToken($fetch, 'Claude Code')}` } } }))
    const place = { name: 'The Lantern', type: 'place', existingId: null, aliases: [], facts: [], description: 'A tavern.', evidence: ['Nobody at the Lantern'] }
    const result = await client.callTool({ name: 'propose_codex_entries', arguments: { entryId: 'scn_meet1ng001', entries: [place] } })
    await client.close()
    expect(result.isError).toBeFalsy()

    const [proposal] = await $fetch<CodexProposal[]>(`${book}/codex/proposals`, { query: { status: 'pending' } })
    expect(proposal).toMatchObject({ title: 'The Lantern', author: { kind: 'mcp', name: 'Claude Code' } })
    const accepted = await post(`/codex/proposals/${proposal!.id}`, { status: 'accepted', edits: { title: 'The Lantern Inn' } })
    expect(accepted.status).toBe(200)
    const places = await $fetch<{ title: string }[]>(`${book}/codex`, { query: { type: 'place' } })
    expect(places.map(p => p.title)).toContain('The Lantern Inn')
    expect((await post(`/codex/proposals/${proposal!.id}`, { status: 'rejected' })).status).toBe(400)
    expect((await post('/codex/proposals/cxp_missing', { status: 'rejected' })).status).toBe(404)
  })
})
