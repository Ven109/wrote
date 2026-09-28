import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import type { AiSettingsView } from '#shared/schemas/ai'
import type { UsageReport } from '#shared/schemas/usage'
import { startFakeOpenAi } from '../utils/fake-openai'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
const ollama = await startFakeOpenAi()
afterAll(() => ollama.close())
await setupApiServer(workspace, import.meta.url)

describe('AI usage', () => {
  it('logs every AI call with its book and feature, priced from the author\'s prices', async () => {
    expect((await $fetch<UsageReport>('/api/settings/usage')).totals.calls).toBe(0)
    const settings = await $fetch<AiSettingsView>('/api/settings/ai', { method: 'PATCH', body: {
      providers: { ollama: { enabled: true, baseUrl: ollama.url } },
      models: { chat: 'ollama:tiny:latest' },
      monthlyBudget: 5,
      prices: { 'ollama:tiny:latest': { input: 1000, output: 1000 } },
    } })
    expect(settings).toMatchObject({ monthlyBudget: 5, prices: { 'ollama:tiny:latest': { input: 1000 } } })

    const thread = await $fetch<{ id: string }>('/api/books/sample-book/chat/threads', { method: 'POST' })
    const reply = await fetch('/api/books/sample-book/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ threadId: thread.id, messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] }], context: {} }),
    })
    await reply.text()

    let report!: UsageReport
    await expect.poll(async () => (report = await $fetch<UsageReport>('/api/settings/usage')).totals.calls).toBeGreaterThan(0)
    expect(report.byFeature[0]).toMatchObject({ key: 'assistant' })
    expect(report.totals.cost).toBeGreaterThan(0)
    expect(report.byModel[0]).toMatchObject({ key: 'ollama:tiny:latest' })
    expect(report.byBook[0]).toMatchObject({ key: 'sample-book', label: 'The Cartographer of Hollow Bay' })
    expect(report.budget).toMatchObject({ budget: 5 })
    expect((await $fetch<UsageReport>('/api/settings/usage', { query: { bookId: 'other' } })).totals.calls).toBe(0)
  })

  it('validates the query', async () => {
    expect((await fetch('/api/settings/usage?months=99')).status).toBe(400)
  })
})
