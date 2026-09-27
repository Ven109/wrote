import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { $fetch } from '@nuxt/test-utils/e2e'
import { afterAll, describe, expect, it } from 'vitest'
import type { Job } from '#shared/schemas/jobs'
import { startFakeOpenAi } from '../utils/fake-openai'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
const ollama = await startFakeOpenAi()
afterAll(() => ollama.close())

await setupApiServer(workspace, import.meta.url)

const book = '/api/books/sample-book'
type Hit = { id: string, title: string, match: 'text' | 'meaning' | 'both', snippet: string }
const search = (q: string, query: Record<string, string> = {}) => $fetch<Hit[]>(`${book}/search`, { query: { q, ...query } })
const embedJobs = async () => (await $fetch<Job[]>(`${book}/jobs`)).filter(job => job.kind === 'embed')
const settled = async () => (await embedJobs()).every(job => !['queued', 'running'].includes(job.status))

describe('hybrid search API', () => {
  it('is full-text only before an embedding model is set up', async () => {
    expect(await search('scenes where Mara feels guilty')).toEqual([])
    expect((await search('harbor'))[0]).toMatchObject({ title: 'The Harbor', match: 'text' })
    expect(await embedJobs()).toEqual([])
  })

  it('embeds the book in the background with a local model and finds scenes by meaning', async () => {
    const view = await $fetch<{ embeddings: boolean }>('/api/settings/ai', {
      method: 'PATCH',
      body: { providers: { ollama: { enabled: true, baseUrl: ollama.url } }, models: { embedding: 'ollama:nomic-embed-text' } },
    })
    expect(view.embeddings).toBe(true)
    await expect.poll(async () => (await embedJobs()).map(job => job.status), { timeout: 15_000 }).toEqual(['succeeded'])
    const [job] = await embedJobs()
    expect(job).toMatchObject({ title: 'Update semantic search', progress: 1 })
    expect((job!.result as { embedded: number }).embedded).toBeGreaterThan(5)

    const hits = await search('scenes where Mara feels guilty', { type: 'scene' })
    expect(hits[0]).toMatchObject({ title: 'The Meeting', match: 'meaning' })
    expect((await search('scenes where Mara feels guilty', { semantic: 'false' }))).toEqual([])
  })

  it('re-embeds only the edited passage after a change, debounced into one job', async () => {
    await expect.poll(settled).toBe(true)
    const before = ollama.embedRequests.flat().length
    const path = join(workspace, 'sample-book/notes/ending.md')
    await writeFile(path, '---\nid: nte_end1ng0001\ntitle: Thoughts about the ending\n---\nShe returns the lighthouse lamp.\n')
    await writeFile(path, '---\nid: nte_end1ng0001\ntitle: Thoughts about the ending\n---\nShe returns the lighthouse lamp to the keeper.\n')
    await expect.poll(async () => (await embedJobs()).length, { timeout: 15_000 }).toBe(2)
    await expect.poll(settled, { timeout: 15_000 }).toBe(true)
    const sent = ollama.embedRequests.flat().slice(before).filter(text => !text.startsWith('scenes where'))
    expect(sent).toEqual(['Thoughts about the ending\n\nShe returns the lighthouse lamp to the keeper.'])
    expect((await search('keeper of the light', { type: 'note' }))[0]?.title).toBe('Thoughts about the ending')
  })
})
