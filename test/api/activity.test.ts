import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '#shared/schemas/activity'
import { createMcpToken } from '../utils/mcp-token'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

const book = '/api/books/sample-book'
const inboxTitles = async () => (await $fetch<{ title: string }[]>(`${book}/notes`, { query: { filter: 'inbox' } })).map(n => n.title)
const undo = (id: string, body: unknown = {}) => fetch(`${book}/activity/${id}/undo`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('activity log API', () => {
  it('lists an MCP write with its before/after state and undoes it', async () => {
    const client = new Client({ name: 'activity-test', version: '1.0.0' })
    const token = await createMcpToken($fetch, 'Cursor', { write: 'allow' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
    await client.callTool({ name: 'create_note', arguments: { title: 'Logged note', body: 'From an agent.' } })
    await client.callTool({ name: 'search', arguments: { query: 'harbor' } })
    await client.close()

    const entries = await $fetch<ActivityEntry[]>(`${book}/activity`, { query: { actor: 'mcp' } })
    expect(entries).toMatchObject([{ tool: 'create_note', actor: { kind: 'mcp', name: 'Cursor' }, undoable: true }])
    expect(entries[0]!.changes[0]).toMatchObject({ before: null, after: expect.stringContaining('From an agent.') })
    expect(await inboxTitles()).toContain('Logged note')

    const response = await undo(entries[0]!.id)
    expect(response.status).toBe(200)
    expect(await inboxTitles()).not.toContain('Logged note')
    expect((await undo(entries[0]!.id)).status).toBe(400)
    const [latest] = await $fetch<ActivityEntry[]>(`${book}/activity`)
    expect(latest).toMatchObject({ tool: 'undo', undoOf: entries[0]!.id })
  })

  it('validates ids and filters', async () => {
    expect((await undo('act_missing000')).status).toBe(404)
    expect((await undo('nope')).status).toBe(400)
    expect((await fetch(`${book}/activity?actor=robot`)).status).toBe(400)
  })
})
