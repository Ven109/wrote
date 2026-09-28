import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { CommentView } from '#shared/schemas/comments'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const base = '/api/books/sample-book/comments'
const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('comments API', () => {
  it('adds, answers and resolves comments on a passage', async () => {
    const created = await post('', { entryId: 'scn_arr1val001', quote: 'The tide was out', body: 'Why now?' })
    expect(created.status).toBe(201)
    const { id } = await created.json() as { id: string }
    expect((await post(`/${id}/replies`, { body: 'Storm season.' })).status).toBe(200)
    const [listed] = await $fetch<CommentView[]>(base, { query: { entryId: 'scn_arr1val001' } })
    expect(listed).toMatchObject({ id, author: { kind: 'user' }, replies: [{ body: 'Storm season.' }], detached: false })
    expect((await post(`/${id}/resolve`, { resolved: true })).status).toBe(200)
    expect(await $fetch(base, { query: { entryId: 'scn_arr1val001' } })).toEqual([])
    expect(await $fetch<CommentView[]>(base, { query: { entryId: 'scn_arr1val001', includeResolved: 'true' } })).toHaveLength(1)
  })

  it('rejects ambiguous passages and unknown comments', async () => {
    expect((await post('', { entryId: 'scn_arr1val001', quote: 'nowhere to be found', body: 'x' })).status).toBe(400)
    expect((await post('/cmt_missing/resolve', { resolved: true })).status).toBe(404)
  })
})
