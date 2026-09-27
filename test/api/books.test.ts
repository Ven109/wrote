import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { $fetch, fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()

await setup({
  server: true,
  nuxtConfig: { runtimeConfig: { workspaceDir: workspace } },
})

describe('GET /api/books/:bookId/search', () => {
  it('returns ranked hits with snippets', async () => {
    const hits = await $fetch<{ title: string }[]>('/api/books/sample-book/search', { query: { q: 'harbor' } })
    expect(hits[0]!.title).toBe('The Harbor')
  })

  it('filters by type', async () => {
    const hits = await $fetch<{ type: string }[]>('/api/books/sample-book/search', { query: { q: 'harbor', type: 'codex' } })
    expect(hits.map(h => h.type)).toEqual(['codex'])
  })

  it('validates the query', async () => {
    const response = await fetch('/api/books/sample-book/search?q=')
    expect(response.status).toBe(400)
  })

  it('returns 404 for unknown books and rejects traversal', async () => {
    expect((await fetch('/api/books/nope/search?q=x')).status).toBe(404)
    expect((await fetch('/api/books/..%2F..%2Fetc/search?q=x')).status).toBe(404)
  })
})

describe('GET /api/books/:bookId/entries/:entryId/links', () => {
  it('returns backlinks and outgoing links', async () => {
    const links = await $fetch<{ backlinks: { title: string }[] }>('/api/books/sample-book/entries/cdx_h0llowbay1/links')
    expect(links.backlinks.map(l => l.title).sort()).toEqual(['Arrival', 'Mara Velden'])
  })
})

describe('GET /api/books/:bookId/events', () => {
  it('streams external file changes', async () => {
    const response = await fetch('/api/books/sample-book/events')
    const reader = response.body!.getReader()
    await new Promise(resolve => setTimeout(resolve, 500))
    await writeFile(join(workspace, 'sample-book/notes/ending.md'), '---\nid: nte_end1ng0001\ntitle: Edited\n---\n')
    let received = ''
    const decoder = new TextDecoder()
    while (!received.includes('notes/ending.md')) {
      const { value, done } = await reader.read()
      if (done) break
      received += decoder.decode(value)
    }
    await reader.cancel()
    expect(received).toContain('"kind":"changed"')
  }, 15_000)
})

describe('library API', () => {
  it('creates, lists, updates and removes books', async () => {
    const created = await $fetch<{ book: { id: string }, firstScenePath: string }>('/api/books', {
      method: 'POST',
      body: { title: 'Api Book', template: 'blank' },
    })
    expect(created.book.id).toBe('api-book')
    expect(created.firstScenePath).toMatch(/^manuscript\/01-part-one\/01-chapter-one\/01-untitled\.md$/)

    const books = await $fetch<{ id: string }[]>('/api/books')
    expect(books.map(b => b.id)).toContain('api-book')

    const updated = await $fetch<{ author: string }>('/api/books/api-book', { method: 'PATCH', body: { author: 'Me' } })
    expect(updated.author).toBe('Me')

    const removed = await fetch('/api/books/api-book', { method: 'DELETE' })
    expect(removed.status).toBe(204)
    expect((await fetch('/api/books/api-book')).status).toBe(404)
  })

  it('validates input', async () => {
    const response = await fetch('/api/books', { method: 'POST', body: JSON.stringify({ title: '' }), headers: { 'content-type': 'application/json' } })
    expect(response.status).toBe(400)
    const open = await fetch('/api/books/open', { method: 'POST', body: JSON.stringify({ path: 'relative' }), headers: { 'content-type': 'application/json' } })
    expect(open.status).toBe(400)
  })
})
