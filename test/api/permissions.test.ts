import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { McpSettingsView, PendingApproval } from '#shared/schemas/permissions'
import { createMcpToken } from '../utils/mcp-token'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

const book = '/api/books/sample-book'
async function connect(token: string) {
  const client = new Client({ name: 'permissions-test', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}
const text = (result: Awaited<ReturnType<Client['callTool']>>) => (result.content as { text: string }[])[0]!.text
const waitingApproval = async () => {
  for (let i = 0; i < 100; i++) {
    const [approval] = await $fetch<PendingApproval[]>(`${book}/approvals`)
    if (approval) return approval
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('no approval request arrived')
}
const inboxTitles = async () => (await $fetch<{ title: string }[]>(`${book}/notes`, { query: { filter: 'inbox' } })).map(n => n.title)

describe('permissions for MCP clients', () => {
  it('holds a write call until the author approves it, attributed to the client', async () => {
    const client = await connect(await createMcpToken($fetch, 'Cursor'))
    const call = client.callTool({ name: 'create_note', arguments: { title: 'Approved idea' } })
    const approval = await waitingApproval()
    expect(approval).toMatchObject({ caller: { kind: 'mcp', name: 'Cursor' }, tool: 'create_note', permission: 'write', input: { title: 'Approved idea' } })
    expect(await $fetch(`${book}/approvals/${approval.id}`, { method: 'POST', body: { approve: true } })).toEqual({ approved: true })
    expect((await call).isError).toBeFalsy()
    await expect.poll(inboxTitles).toContain('Approved idea')
    await client.close()
  })

  it('returns a clear error to the agent when the author denies, and never runs the call', async () => {
    const client = await connect(await createMcpToken($fetch, 'Cursor'))
    const call = client.callTool({ name: 'create_note', arguments: { title: 'Denied idea' } })
    const approval = await waitingApproval()
    await $fetch(`${book}/approvals/${approval.id}`, { method: 'POST', body: { approve: false } })
    const result = await call
    expect(result.isError).toBe(true)
    expect(text(result)).toMatch(/did not approve create_note/)
    expect(await inboxTitles()).not.toContain('Denied idea')
    expect((await fetch(`${book}/approvals/${approval.id}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ approve: true }) })).status).toBe(404)
    await client.close()
  })

  it('applies per-client policies, and revoked tokens stop working at once', async () => {
    const created = await $fetch<{ client: { id: string }, token: string }>('/api/settings/mcp/clients', { method: 'POST', body: { name: 'Read-only agent', policy: { propose: 'deny', write: 'deny' } } })
    const client = await connect(created.token)
    const names = (await client.listTools()).tools.map(t => t.name)
    expect(names).toContain('search')
    expect(names).not.toContain('create_note')
    await client.close()

    const view = await $fetch<McpSettingsView>('/api/settings/mcp')
    expect(JSON.stringify(view)).not.toContain(created.token)
    expect(view.clients.find(c => c.id === created.client.id)?.policy).toMatchObject({ read: 'allow', propose: 'deny', write: 'deny' })
    await $fetch(`/api/settings/mcp/clients/${created.client.id}`, { method: 'PATCH', body: { policy: { write: 'allow' } } })
    expect((await $fetch<McpSettingsView>('/api/settings/mcp')).clients.find(c => c.id === created.client.id)?.policy.write).toBe('allow')
    expect((await fetch(`/api/settings/mcp/clients/${created.client.id}`, { method: 'DELETE' })).status).toBe(204)
    await expect(connect(created.token)).rejects.toThrow(/401|invalid MCP token/i)
  })

  it('validates settings input and keeps a separate assistant policy', async () => {
    const post = (body: unknown) => fetch('/api/settings/mcp/clients', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    expect((await post({ name: '' })).status).toBe(400)
    expect((await post({ name: 'x', policy: { destructive: 'allow' } })).status).toBe(400)
    expect((await fetch('/api/settings/mcp/clients/mcp_missing0001', { method: 'DELETE' })).status).toBe(404)
    const { assistant } = await $fetch<{ assistant: { write: string } }>('/api/settings/mcp/assistant', { method: 'PATCH', body: { policy: { write: 'deny' } } })
    expect(assistant.write).toBe('deny')
  })
})
