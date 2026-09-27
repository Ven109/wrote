import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

/** A minimal Ollama stand-in: model list + OpenAI-compatible chat completions. */
function fakeOllama(): Promise<{ server: Server, url: string }> {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    if (request.url === '/api/tags') {
      response.end(JSON.stringify({ models: [{ name: 'tiny:latest' }] }))
      return
    }
    if (request.url === '/v1/chat/completions') {
      response.end(JSON.stringify({
        id: 'c1',
        object: 'chat.completion',
        created: 0,
        model: 'tiny:latest',
        choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
      }))
      return
    }
    response.statusCode = 404
    response.end('{}')
  })
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${(server.address() as AddressInfo).port}` })))
}

const workspace = await createTestWorkspace()
const ollama = await fakeOllama()
afterAll(() => ollama.server.close())

await setupApiServer(workspace, import.meta.url)

describe('/api/settings/ai', () => {
  it('starts unconfigured', async () => {
    const view = await $fetch<{ configured: boolean }>('/api/settings/ai')
    expect(view.configured).toBe(false)
  })

  it('saves keys write-only', async () => {
    const view = await $fetch<Record<string, unknown>>('/api/settings/ai', {
      method: 'PATCH',
      body: { providers: { anthropic: { enabled: true } }, keys: { anthropic: 'sk-ant-very-secret' } },
    })
    expect(JSON.stringify(view)).not.toContain('very-secret')
    expect(JSON.stringify(await $fetch('/api/settings/ai'))).not.toContain('very-secret')
  })

  it('works end-to-end with a local Ollama model', async () => {
    const view = await $fetch<{ configured: boolean }>('/api/settings/ai', {
      method: 'PATCH',
      body: { providers: { ollama: { enabled: true, baseUrl: ollama.url } }, models: { chat: 'ollama:tiny:latest' } },
    })
    expect(view.configured).toBe(true)
    const models = await $fetch<{ id: string }[]>('/api/settings/ai/models', { query: { provider: 'ollama' } })
    expect(models.map(m => m.id)).toContain('tiny:latest')
    const grouped = await $fetch<{ provider: string, models: { id: string }[] }[]>('/api/settings/ai/models')
    expect(grouped.find(g => g.provider === 'ollama')?.models.map(m => m.id)).toContain('tiny:latest')
    const result = await $fetch<{ ok: boolean, message: string }>('/api/settings/ai/test', { method: 'POST', body: { model: 'ollama:tiny:latest' } })
    expect(result).toMatchObject({ ok: true, message: 'OK' })
  })

  it('validates input', async () => {
    const bad = await fetch('/api/settings/ai', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ models: { chat: 'no-provider' } }) })
    expect(bad.status).toBe(400)
    expect((await fetch('/api/settings/ai/models?provider=nope')).status).toBe(400)
  })
})
