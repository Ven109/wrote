import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useMcpSettings } from './useMcpSettings'

const patches: unknown[] = []
const policy = { read: 'allow', propose: 'allow', write: 'ask', destructive: 'ask' }
registerEndpoint('/api/settings/mcp', () => ({ url: 'http://localhost:3000/mcp', clients: [], assistant: policy }))
registerEndpoint('/api/settings/mcp/clients', { method: 'POST', handler: async (event) => {
  const { name } = await readBody<{ name: string }>(event)
  return { client: { id: 'mcp_1', name, tokenPreview: 'wrote_abcd…', createdAt: '', lastUsedAt: null, policy }, token: 'wrote_abcdef' }
} })
registerEndpoint('/api/settings/mcp/assistant', { method: 'PATCH', handler: async event => patches.push(await readBody(event)) })

describe('useMcpSettings', () => {
  it('creates a client and shows its token once with ready-made configs', async () => {
    let mcp!: ReturnType<typeof useMcpSettings>
    await mountSuspended(defineComponent({
      setup() {
        mcp = useMcpSettings()
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(mcp.data.value?.url).toBe('http://localhost:3000/mcp'))
    mcp.newName.value = 'Claude Code'
    await mcp.createClient()
    expect(mcp.created.value?.token).toBe('wrote_abcdef')
    expect(mcp.configs.value[0]!.snippet).toContain('Bearer wrote_abcdef')
    expect(mcp.newName.value).toBe('')
    mcp.dismissToken()
    expect(mcp.configs.value).toEqual([])
    await mcp.setAssistantPolicy({ write: 'deny' })
    expect(patches).toEqual([{ policy: { write: 'deny' } }])
  })
})
