import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { getQuery, readBody } from 'h3'
import type { AiSettingsView } from '#shared/schemas/ai'
import { useAiSettings, useAiStatus } from './useAiSettings'

let view: AiSettingsView = {
  providers: [{ id: 'ollama', label: 'Ollama', local: true, needsKey: false, enabled: false, baseUrl: null, defaultBaseUrl: 'http://localhost:11434', hasKey: false, keySource: null }],
  models: {},
  configured: false,
  embeddings: false,
  summaries: { enabled: false, dailyTokenBudget: 100_000 },
  autocomplete: false,
  provenanceThreshold: 0.5,
}
const patches: unknown[] = []
registerEndpoint('/api/settings/ai', { method: 'GET', handler: () => view })
registerEndpoint('/api/settings/ai', {
  method: 'PATCH',
  async handler(event) {
    const patch = await readBody<{ providers?: { ollama?: { enabled?: boolean } }, models?: { chat?: string } }>(event)
    patches.push(patch)
    view = {
      ...view,
      providers: view.providers.map(p => ({ ...p, enabled: patch.providers?.ollama?.enabled ?? p.enabled })),
      models: { ...view.models, ...patch.models },
      configured: Boolean(patch.models?.chat ?? view.models.chat),
    }
    return view
  },
})
registerEndpoint('/api/settings/ai/models', event => getQuery(event).purpose === 'embedding'
  ? [{ provider: 'ollama', models: [{ id: 'nomic-embed-text', label: 'nomic' }] }]
  : [{ provider: 'ollama', models: [{ id: 'tiny', label: 'tiny' }] }])
registerEndpoint('/api/settings/ai/test', { method: 'POST', handler: () => ({ ok: true, message: 'OK', latencyMs: 12 }) })

async function mountAi() {
  let api!: ReturnType<typeof useAiSettings>
  let status!: ReturnType<typeof useAiStatus>
  await mountSuspended(defineComponent({
    setup() {
      api = useAiSettings()
      status = useAiStatus()
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(api.providers.value).toHaveLength(1))
  return { api, status }
}

describe('useAiSettings', () => {
  it('enables a provider, picks a model and reports configured', async () => {
    const { api, status } = await mountAi()
    expect(status.configured.value).toBe(false)
    await api.toggleProvider('ollama', true)
    await vi.waitFor(() => expect(api.modelItems()[0]?.[1]).toEqual({ label: 'tiny', value: 'ollama:tiny' }))
    expect(api.testModelFor('ollama')).toBe('ollama:tiny')
    await api.setModel('chat', 'ollama:tiny')
    expect(status.configured.value).toBe(true)
    expect(patches).toEqual([{ providers: { ollama: { enabled: true } } }, { models: { chat: 'ollama:tiny' } }])
  })

  it('offers embedding models separately and sets the embedding model', async () => {
    const { api } = await mountAi()
    await vi.waitFor(() => expect(api.embeddingItems()[0]?.[1]).toEqual({ label: 'nomic', value: 'ollama:nomic-embed-text' }))
    await api.setModel('embedding', 'ollama:nomic-embed-text')
    expect(patches.at(-1)).toEqual({ models: { embedding: 'ollama:nomic-embed-text' } })
  })

  it('runs a connection test per provider', async () => {
    const { api } = await mountAi()
    const running = api.test('ollama', 'ollama:tiny')
    expect(api.tests.value.ollama).toBe('running')
    await running
    expect(api.tests.value.ollama).toEqual({ ok: true, message: 'OK', latencyMs: 12 })
  })
})
