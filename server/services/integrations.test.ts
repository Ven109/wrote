import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTempDir } from '../../test/utils/workspace'
import { startFakeOAuthMcp } from '../../test/utils/fake-mcp-http'
import { disconnectAll, peekConnection } from '../integrations/manager'
import { readSecrets } from '../integrations/store'
import { externalToolName, externalToolSet } from '../integrations/tools'
import { completeSignIn, deleteIntegration, listIntegrations, reconnectIntegration, saveIntegration, setToolEnabled } from './integrations'

const FAKE_SERVER = join(import.meta.dirname, '../../test/utils/fake-mcp-server.mjs')
let workspace: string
beforeEach(async () => {
  workspace = await createTempDir('wrote-integrations-')
})
afterEach(() => disconnectAll())

const stdio = { id: 'search', name: 'Web search', transport: 'stdio' as const, url: null, command: process.execPath, args: [FAKE_SERVER], envKeys: [], headerKeys: [], enabled: true, policy: 'allow' as const, disabledTools: [], env: { FAKE_SEARCH_KEY: 'secret-key' }, headers: {} }
const callTool = async (tools: Awaited<ReturnType<typeof externalToolSet>>, name: string, input: unknown) =>
  (tools[name]!.execute as unknown as (input: unknown, options: { toolCallId: string, messages: [], abortSignal?: AbortSignal }) => Promise<unknown>)(input, { toolCallId: 't1', messages: [] })

describe('stdio integrations', () => {
  it('connect a local server, keep secrets out of the settings and list its tools', async () => {
    const saved = await saveIntegration(workspace, stdio, { create: true })
    expect(saved).toMatchObject({ state: 'connected', envKeys: ['FAKE_SEARCH_KEY'], secretsSet: ['FAKE_SEARCH_KEY'] })
    expect(saved.tools.map(tool => tool.name)).toEqual(['web_search', 'crash'])
    expect(JSON.stringify(await listIntegrations(workspace))).not.toContain('secret-key')
    expect((await readSecrets(workspace, 'search')).env).toEqual({ FAKE_SEARCH_KEY: 'secret-key' })
    await expect(saveIntegration(workspace, stdio, { create: true })).rejects.toThrow(/already exists/)
  })

  it('bridge enabled tools into the assistant\'s tool set, namespaced, with the server\'s env', async () => {
    await saveIntegration(workspace, stdio, { create: true })
    await setToolEnabled(workspace, 'search', 'crash', false)
    const tools = await externalToolSet(workspace, { bookId: 'b', caller: { kind: 'assistant', name: 'Assistant' } })
    expect(Object.keys(tools)).toEqual([externalToolName('search', 'web_search')])
    expect(await callTool(tools, 'search__web_search', { query: 'lighthouse' })).toEqual({ result: 'Results for "lighthouse": Lighthouses were automated in the 1980s (with key).', note: 'From Web search (external, untrusted content).' })
  })

  it('offer nothing when disabled or denied, and restart a crashed server on next use', async () => {
    await saveIntegration(workspace, { ...stdio, policy: 'deny' }, { create: true })
    expect(await externalToolSet(workspace, { bookId: 'b', caller: { kind: 'assistant', name: 'Assistant' } })).toEqual({})
    await saveIntegration(workspace, { ...stdio, policy: 'allow' }, { create: false })
    const tools = await externalToolSet(workspace, { bookId: 'b', caller: { kind: 'assistant', name: 'Assistant' } })
    await callTool(tools, 'search__crash', {})
    await expect.poll(() => peekConnection('search')?.state).toBe('disconnected')
    const again = await externalToolSet(workspace, { bookId: 'b', caller: { kind: 'assistant', name: 'Assistant' } })
    expect(await callTool(again, 'search__web_search', { query: 'x' })).toMatchObject({ result: expect.stringContaining('Results for "x"') })
    await saveIntegration(workspace, { ...stdio, enabled: false }, { create: false })
    expect((await listIntegrations(workspace))[0]).toMatchObject({ state: 'disconnected' })
  })

  it('report a server that does not start, and delete integrations with their secrets', async () => {
    const broken = await saveIntegration(workspace, { ...stdio, id: 'broken', command: '/nonexistent/server' }, { create: true })
    expect(broken).toMatchObject({ state: 'error', error: expect.any(String) })
    await deleteIntegration(workspace, 'broken')
    expect(await readSecrets(workspace, 'broken')).toEqual({ env: {}, headers: {}, oauth: {} })
    await expect(reconnectIntegration(workspace, 'broken')).rejects.toThrow(/broken/)
  })
})

describe('remote integrations with OAuth', () => {
  it('ask to sign in, finish the flow from the callback and list the tools', { timeout: 30_000 }, async () => {
    const remote = await startFakeOAuthMcp()
    try {
      const redirectUrl = 'http://localhost:3000/api/settings/integrations/oauth/callback'
      const input = { ...stdio, id: 'dictionary', name: 'Dictionary', transport: 'http' as const, url: remote.url, command: null, args: [], env: {} }
      const saved = await saveIntegration(workspace, input, { create: true, redirectUrl })
      expect(saved).toMatchObject({ state: 'needs-auth', authUrl: expect.stringContaining('/authorize?') })
      const callback = new URL(remote.approve(saved.authUrl!))
      await expect(completeSignIn(workspace, { code: callback.searchParams.get('code')!, state: 'dictionary.forged', redirectUrl })).rejects.toThrow(/not valid/)
      expect(await completeSignIn(workspace, { code: callback.searchParams.get('code')!, state: callback.searchParams.get('state')!, redirectUrl })).toBe('dictionary')
      const [view] = await listIntegrations(workspace)
      expect(view).toMatchObject({ state: 'connected', tools: [{ name: 'lookup' }] })
      expect((await readSecrets(workspace, 'dictionary')).oauth).toMatchObject({ tokens: { access_token: expect.stringMatching(/^tok_/) } })
      // The assistant reconnects with the stored tokens, without a request to derive the callback URL from.
      await disconnectAll()
      const tools = await externalToolSet(workspace, { bookId: 'b', caller: { kind: 'assistant', name: 'Assistant' } })
      expect(await callTool(tools, 'dictionary__lookup', { word: 'lighthouse' })).toMatchObject({ result: 'lighthouse: a tower with a light' })
    }
    finally {
      await remote.close()
    }
  })
})
