import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import { startFakeOpenAi } from '../utils/fake-openai'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
const ollama = await startFakeOpenAi()
afterAll(() => ollama.close())

await setupApiServer(workspace, import.meta.url)

const base = '/api/books/sample-book/chat'
const ask = (threadId: string, text: string) => fetch(base, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ threadId, messages: [{ id: 'u1', role: 'user', parts: [{ type: 'text', text }] }], context: {} }),
})

describe('assistant chat API', () => {
  it('refuses to chat without an AI model (409) and manages threads', async () => {
    const thread = await $fetch<{ id: string, title: string }>(`${base}/threads`, { method: 'POST' })
    expect(thread.title).toBe('New chat')
    const response = await ask(thread.id, 'Hi')
    expect(response.status).toBe(409)
    expect((await response.json()).data.code).toBe('ai_not_configured')
    expect((await fetch(`${base}/threads/${thread.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await fetch(`${base}/threads/${thread.id}/messages`)).status).toBe(404)
  })

  it('answers "Which scenes mention the harbor?" with the search tool and stores the thread', async () => {
    await $fetch('/api/settings/ai', { method: 'PATCH', body: { providers: { ollama: { enabled: true, baseUrl: ollama.url } }, models: { chat: 'ollama:tiny:latest' } } })
    const thread = await $fetch<{ id: string }>(`${base}/threads`, { method: 'POST' })
    const response = await ask(thread.id, 'Which scenes mention the harbor?')
    expect(response.status).toBe(200)
    const stream = await response.text()
    expect(stream).toContain('"toolName":"search"')
    expect(stream).toContain('The harbor appears in')

    // The tool result (search hits from the real index) went back to the model.
    const toolMessage = ollama.requests.at(-1)!.messages.find(message => message.role === 'tool')
    expect(JSON.stringify(toolMessage)).toContain('Arrival')

    await expect.poll(async () => (await $fetch<unknown[]>(`${base}/threads/${thread.id}/messages`)).length).toBe(2)

    // The answer carries the id of the stored context snapshot, which matches what the model received.
    const snapshotId = stream.match(/"contextSnapshotId":"(ctx_[a-z0-9]+)"/)?.[1]
    const snapshot = await $fetch<{ system: string, items: { id: string }[] }>(`/api/books/sample-book/context/${snapshotId}`)
    expect(ollama.requests.at(-1)!.messages[0]!.content).toBe(snapshot.system)
    expect(snapshot.items.length).toBeGreaterThan(0)
    const threads = await $fetch<{ id: string, title: string }[]>(`${base}/threads`)
    expect(threads.find(t => t.id === thread.id)?.title).toBe('Which scenes mention the harbor?')
  })

  it('validates requests', async () => {
    const bad = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ threadId: 'nope', messages: [] }) })
    expect(bad.status).toBe(400)
    expect((await ask('thr_missing', 'x')).status).toBe(404)
    expect((await fetch('/api/books/sample-book/context/ctx_missing0000')).status).toBe(404)
    expect((await fetch('/api/books/sample-book/context/nope')).status).toBe(400)
  })
})
