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

describe('review API', () => {
  const review = (path: string, body: unknown) => fetch(`/api/books/sample-book/review/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

  it('lists agents, estimates runs and needs a model to start one', async () => {
    expect(await $fetch('/api/books/sample-book/review/agents')).toMatchObject([{ id: 'editor', name: 'Editor' }])
    const estimate = await review('estimate', { agentId: 'editor', scope: 'chapter', targetId: 'chp_harb0r0001' })
    expect(estimate.status).toBe(200)
    expect(await estimate.json()).toMatchObject({ scenes: 2, calls: 2 })
    const start = await review('runs', { agentId: 'editor', scope: 'scene', targetId: 'scn_arr1val001' })
    expect(start.status).toBe(409)
    expect(await start.json()).toMatchObject({ data: { code: 'ai_not_configured' } })
    expect((await review('estimate', { agentId: 'editor', scope: 'chapter', targetId: 'scn_arr1val001' })).status).toBe(400)
    expect((await review('estimate', { agentId: 'nobody', scope: 'book' })).status).toBe(404)
    expect(await $fetch('/api/books/sample-book/review/runs', { query: { sceneId: 'scn_arr1val001' } })).toEqual([])
  })

  it('only dismisses or fixes findings', async () => {
    const created = await (await post('', { entryId: 'scn_arr1val001', quote: 'The harbor smelled of salt and tar', body: 'Plain comment.' })).json() as CommentView
    expect((await post(`/${created.id}/dismiss`, {})).status).toBe(404)
    expect((await post(`/${created.id}/fix`, {})).status).toBe(404)
  })
})
