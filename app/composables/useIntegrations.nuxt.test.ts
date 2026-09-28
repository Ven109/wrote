import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { IntegrationView } from '#shared/schemas/integrations'
import { useIntegrations } from './useIntegrations'

const existing: IntegrationView = { id: 'web-search', name: 'Web search', transport: 'stdio', url: null, command: 'npx', args: ['-y', 'server'], envKeys: ['BRAVE_API_KEY', 'OLD'], headerKeys: [], enabled: true, policy: 'allow', disabledTools: ['x'], state: 'connected', error: null, authUrl: null, tools: [{ name: 'web_search', title: 'Web search', description: '', enabled: true }], secretsSet: ['BRAVE_API_KEY', 'OLD'] }
const bodies: unknown[] = []
registerEndpoint('/api/settings/integrations', { method: 'GET', handler: () => [existing] })
registerEndpoint('/api/settings/integrations', { method: 'POST', handler: async (event) => {
  const body = await readBody(event)
  bodies.push(body)
  return { ...existing, ...body, id: body.id, name: body.name, tools: [] }
} })
registerEndpoint('/api/settings/integrations/web-search', { method: 'PUT', handler: async (event) => {
  bodies.push(await readBody(event))
  return existing
} })

describe('useIntegrations', () => {
  it('turns the form into a save: args per line, new secrets set, removed rows cleared, stored ones kept', async () => {
    let integrations!: ReturnType<typeof useIntegrations>
    await mountSuspended(defineComponent({
      setup() {
        integrations = useIntegrations()
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(integrations.integrations.value).toHaveLength(1))
    integrations.create({ transport: 'stdio', command: 'node', argsText: 'server.mjs\n\n--flag ', secrets: [{ key: 'TOKEN', value: 's3cret' }] })
    integrations.form.value!.name = 'Zotero library'
    await nextTick()
    expect(integrations.form.value!.id).toBe('zotero-library')
    await integrations.save()
    expect(bodies.at(-1)).toMatchObject({ id: 'zotero-library', command: 'node', args: ['server.mjs', '--flag'], url: null, env: { TOKEN: 's3cret' }, headers: {}, policy: 'ask' })

    integrations.edit(existing)
    expect(integrations.form.value!.secrets).toEqual([{ key: 'BRAVE_API_KEY', value: '' }, { key: 'OLD', value: '' }])
    integrations.form.value!.secrets.splice(1, 1)
    await integrations.save()
    expect(bodies.at(-1)).toMatchObject({ id: 'web-search', env: { OLD: null }, disabledTools: ['x'] })
    expect((bodies.at(-1) as { env: Record<string, unknown> }).env).not.toHaveProperty('BRAVE_API_KEY')
  })
})
