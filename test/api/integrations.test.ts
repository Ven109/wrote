import { join } from 'node:path'
import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { IntegrationView } from '#shared/schemas/integrations'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const FAKE_SERVER = join(import.meta.dirname, '../utils/fake-mcp-server.mjs')
const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const search = { id: 'web-search', name: 'Web search', transport: 'stdio', url: null, command: process.execPath, args: [FAKE_SERVER], envKeys: [], headerKeys: [], enabled: true, policy: 'allow', disabledTools: [], env: { FAKE_SEARCH_KEY: 'k' }, headers: {} }

describe('integrations API', () => {
  it('adds a local server, lists its tools, toggles one and removes it', async () => {
    const created = await fetch('/api/settings/integrations', json('POST', search))
    expect(created.status).toBe(201)
    const view = await created.json() as IntegrationView
    expect(view).toMatchObject({ state: 'connected', secretsSet: ['FAKE_SEARCH_KEY'] })
    expect(JSON.stringify(view)).not.toContain('"k"')
    expect((await fetch('/api/settings/integrations', json('POST', search))).status).toBe(400)
    const toggled = await (await fetch('/api/settings/integrations/web-search/tools/crash', json('PATCH', { enabled: false }))).json() as IntegrationView
    expect(toggled.tools.find(tool => tool.name === 'crash')).toMatchObject({ enabled: false })
    expect((await $fetch<IntegrationView[]>('/api/settings/integrations'))[0]).toMatchObject({ id: 'web-search', disabledTools: ['crash'] })
    expect((await fetch('/api/settings/integrations/web-search', { method: 'DELETE' })).status).toBe(204)
    expect(await $fetch('/api/settings/integrations')).toEqual([])
  })

  it('validates input and refuses forged OAuth callbacks', async () => {
    expect((await fetch('/api/settings/integrations', json('POST', { ...search, command: null }))).status).toBe(400)
    expect((await fetch('/api/settings/integrations', json('POST', { ...search, transport: 'http', url: null }))).status).toBe(400)
    expect((await fetch('/api/settings/integrations/nope/connect', { method: 'POST' })).status).toBe(404)
    const callback = await fetch('/api/settings/integrations/oauth/callback?code=x&state=web-search.forged', { redirect: 'manual' })
    expect(callback.status).toBe(302)
    expect(callback.headers.get('location')).toMatch(/^\/settings\/integrations\?error=/)
  })
})
