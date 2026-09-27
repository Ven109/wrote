import { mkdtemp, stat, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { assistantPolicy, authenticateMcpClient, createMcpClient, deleteMcpClient, mcpSettingsView, updateAssistantPolicy, updateMcpClient } from './mcp-clients'

let workspace: string
beforeEach(async () => {
  workspace = await mkdtemp(join(tmpdir(), 'wrote-clients-'))
})

describe('MCP clients', () => {
  it('creates clients with their own token (shown once, stored hashed, owner-only)', async () => {
    const { client, token } = await createMcpClient(workspace, { name: 'Claude Code' })
    expect(token).toMatch(/^wrote_[0-9a-f]{48}$/)
    expect(client).toMatchObject({ name: 'Claude Code', tokenPreview: token.slice(0, 10) + '…', policy: { write: 'ask', destructive: 'ask' } })
    expect(client).not.toHaveProperty('tokenHash')
    const file = join(workspace, '.wrote', 'mcp-clients.json')
    expect((await stat(file)).mode & 0o777).toBe(0o600)
    expect(JSON.stringify(await mcpSettingsView(workspace, 'http://x/mcp'))).not.toContain(token)
  })

  it('authenticates each request as its client, and revoked tokens stop working', async () => {
    const a = await createMcpClient(workspace, { name: 'Claude Code', policy: { write: 'allow' } })
    const b = await createMcpClient(workspace, { name: 'Cursor' })
    expect(await authenticateMcpClient(workspace, `Bearer ${a.token}`)).toMatchObject({ name: 'Claude Code', policy: { write: 'allow' } })
    expect((await authenticateMcpClient(workspace, `Bearer ${b.token}`))?.name).toBe('Cursor')
    expect(await authenticateMcpClient(workspace, 'Bearer wrote_nope')).toBeNull()
    expect(await authenticateMcpClient(workspace, undefined)).toBeNull()
    await deleteMcpClient(workspace, a.client.id)
    expect(await authenticateMcpClient(workspace, `Bearer ${a.token}`)).toBeNull()
    const view = await mcpSettingsView(workspace, 'http://x/mcp')
    expect(view.clients.map(c => c.name)).toEqual(['Cursor'])
    expect(view.clients[0]!.lastUsedAt).not.toBeNull()
  })

  it('updates names and policies without resetting other levels', async () => {
    const { client } = await createMcpClient(workspace, { name: 'Agent' })
    const updated = await updateMcpClient(workspace, client.id, { name: 'Research agent', policy: { propose: 'deny' } })
    expect(updated).toMatchObject({ name: 'Research agent', policy: { read: 'allow', propose: 'deny', write: 'ask', destructive: 'ask' } })
    await expect(updateMcpClient(workspace, 'mcp_missing', {})).rejects.toMatchObject({ code: 'not_found' })
  })

  it('keeps the assistant\'s own policy', async () => {
    expect(await assistantPolicy(workspace)).toEqual({ read: 'allow', propose: 'allow', write: 'ask', destructive: 'ask' })
    expect(await updateAssistantPolicy(workspace, { write: 'deny' })).toMatchObject({ write: 'deny', propose: 'allow' })
  })

  it('turns the single token of earlier versions into a client, so existing setups keep working', async () => {
    await mkdir(join(workspace, '.wrote'), { recursive: true })
    await writeFile(join(workspace, '.wrote', 'mcp-token'), 'wrote_legacy\n')
    expect(await authenticateMcpClient(workspace, 'Bearer wrote_legacy')).toMatchObject({ name: 'Default client' })
    await expect(stat(join(workspace, '.wrote', 'mcp-token'))).rejects.toThrow()
  })

  it('does not lose concurrent changes', async () => {
    await Promise.all(Array.from({ length: 5 }, (_, i) => createMcpClient(workspace, { name: `Client ${i}` })))
    expect((await mcpSettingsView(workspace, 'u')).clients).toHaveLength(5)
  })
})
