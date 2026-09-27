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

describe('manuscript structure API', () => {
  it('creates, renames, moves and deletes nodes', async () => {
    type Node = { id: string, title: string, children: Node[] }
    const part = await $fetch<{ id: string }>('/api/books/sample-book/structure', { method: 'POST', body: { type: 'part', title: 'Part Two' } })
    const chapter = await $fetch<{ id: string }>('/api/books/sample-book/structure', { method: 'POST', body: { type: 'chapter', title: 'Storm', parentId: part.id } })
    await $fetch(`/api/books/sample-book/structure/${chapter.id}`, { method: 'PATCH', body: { title: 'The Storm' } })
    const moved = await $fetch<Node[]>('/api/books/sample-book/structure/scn_meet1ng001/move', { method: 'POST', body: { parentId: chapter.id, index: 0 } })
    expect(moved[1]!.children[0]).toMatchObject({ title: 'The Storm', children: [expect.objectContaining({ id: 'scn_meet1ng001' })] })
    expect((await fetch(`/api/books/sample-book/structure/${part.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await $fetch<Node[]>('/api/books/sample-book/structure')).map(p => p.title)).toEqual(['Part One'])
  })

  it('rejects invalid structure changes', async () => {
    const res = await fetch('/api/books/sample-book/structure', { method: 'POST', body: JSON.stringify({ type: 'scene', title: 'x' }), headers: { 'content-type': 'application/json' } })
    expect(res.status).toBe(400)
  })
})

describe('GET/PUT /api/books/:bookId/document', () => {
  const path = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'

  it('reads and saves a document with conflict detection', async () => {
    const doc = await $fetch<{ id: string, body: string, hash: string }>('/api/books/sample-book/document', { query: { path } })
    expect(doc.id).toBe('scn_themap0001')
    const saved = await $fetch<{ hash: string, body: string }>('/api/books/sample-book/document', {
      method: 'PUT',
      body: { path, body: 'A new first line.\n', expectedHash: doc.hash },
    })
    expect(saved.body).toBe('A new first line.\n')
    const stale = await fetch('/api/books/sample-book/document', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, body: 'Other', expectedHash: doc.hash }),
    })
    expect(stale.status).toBe(409)
  })

  it('validates paths', async () => {
    expect((await fetch('/api/books/sample-book/document?path=wrote.json')).status).toBe(400)
    expect((await fetch('/api/books/sample-book/document?path=manuscript/missing.md')).status).toBe(404)
    expect((await fetch('/api/books/sample-book/document?path=..%2F..%2Fsecret.md')).status).toBe(400)
  })
})

describe('PATCH /api/books/:bookId/document', () => {
  it('updates scene metadata and validates it', async () => {
    const path = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
    const saved = await $fetch<{ frontmatter: Record<string, unknown> }>('/api/books/sample-book/document', {
      method: 'PATCH',
      body: { path, meta: { pov: 'Mara', location: 'The Lantern' } },
    })
    expect(saved.frontmatter).toMatchObject({ pov: 'Mara', location: 'The Lantern' })
    const invalid = await fetch('/api/books/sample-book/document', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ path, meta: { status: 'bogus' } }),
    })
    expect(invalid.status).toBe(400)
  })
})

describe('/api/books/:bookId/notes', () => {
  it('captures, lists, counts and files notes', async () => {
    const created = await $fetch<{ path: string }>('/api/books/sample-book/notes', { method: 'POST', body: { text: 'API capture\nbody' } })
    expect(created.path).toBe('notes/inbox/api-capture.md')
    const inbox = await $fetch<{ title: string }[]>('/api/books/sample-book/notes', { query: { filter: 'inbox' } })
    expect(inbox.map(n => n.title)).toContain('API capture')
    const counts = await $fetch<{ inbox: number }>('/api/books/sample-book/notes/counts')
    expect(counts.inbox).toBeGreaterThanOrEqual(2)
    const filed = await $fetch<{ path: string }>('/api/books/sample-book/notes/file', { method: 'POST', body: { path: created.path } })
    expect(filed.path).toBe('notes/api-capture.md')
  })

  it('validates input', async () => {
    expect((await fetch('/api/books/sample-book/notes?filter=bogus')).status).toBe(400)
    const empty = await fetch('/api/books/sample-book/notes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: '  ' }) })
    expect(empty.status).toBe(400)
  })
})
