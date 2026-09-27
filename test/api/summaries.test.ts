import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import type { Job } from '#shared/schemas/jobs'
import type { Summary } from '#shared/schemas/summaries'
import { startFakeOpenAi } from '../utils/fake-openai'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
// Answers every summary request with "Summary of <title>." (the title is the first quoted string).
const ollama = await startFakeOpenAi((messages) => {
  const prompt = JSON.stringify(messages.at(-1)?.content ?? '')
  return { text: `Summary of ${prompt.match(/\\"([^\\]+)\\"/)?.[1]}.` }
})
afterAll(() => ollama.close())

await setupApiServer(workspace, import.meta.url)

const book = '/api/books/sample-book'
const summaries = () => $fetch<Summary[]>(`${book}/summaries`)
const summaryJobs = async () => (await $fetch<Job[]>(`${book}/jobs`)).filter(job => job.kind === 'summarize')

describe('summaries API', () => {
  it('has no summaries while summaries are off', async () => {
    await $fetch(`${book}/structure`)
    expect(await summaries()).toEqual([])
    expect(await $fetch(`${book}/summaries`, { query: { entryId: 'scn_arr1val001' } })).toEqual({ summary: null })
  })

  it('writes summaries in the background once switched on, rolled up to the book', async () => {
    await $fetch('/api/settings/ai', {
      method: 'PATCH',
      body: { providers: { ollama: { enabled: true, baseUrl: ollama.url } }, models: { chat: 'ollama:tiny:latest' }, summaries: { enabled: true } },
    })
    await expect.poll(async () => (await summaryJobs()).map(job => job.status), { timeout: 15_000 }).toEqual(['succeeded'])
    const byId = Object.fromEntries((await summaries()).map(summary => [summary.entryId, summary]))
    expect(byId.scn_meet1ng001).toMatchObject({ scope: 'scene', text: 'Summary of The Meeting.', isManual: false, model: 'ollama:tiny:latest' })
    expect(byId.book?.scope).toBe('book')
    expect(Object.keys(byId)).toHaveLength(7)
  })

  it('keeps a manual edit, and resets it to automatic', async () => {
    const saved = await $fetch<Summary>(`${book}/summaries`, { method: 'PUT', body: { entryId: 'scn_meet1ng001', text: 'Mara is shunned at the Lantern.' } })
    expect(saved).toMatchObject({ isManual: true, text: 'Mara is shunned at the Lantern.' })
    expect(await $fetch(`${book}/summaries`, { query: { entryId: 'scn_meet1ng001' } })).toEqual({ summary: saved })
    expect((await fetch(`${book}/summaries?entryId=scn_meet1ng001`, { method: 'DELETE' })).status).toBe(204)
    await expect.poll(async () => (await $fetch<{ summary: Summary | null }>(`${book}/summaries`, { query: { entryId: 'scn_meet1ng001' } })).summary?.text, { timeout: 15_000 })
      .toBe('Summary of The Meeting.')
  })

  it('validates input', async () => {
    expect((await fetch(`${book}/summaries`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entryId: 'scn_meet1ng001', text: '' }) })).status).toBe(400)
    expect((await fetch(`${book}/summaries`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ entryId: 'scn_missing001', text: 'x' }) })).status).toBe(404)
    expect((await fetch(`${book}/summaries?entryId=nte_end1ng0001`, { method: 'DELETE' })).status).toBe(400)
  })
})
