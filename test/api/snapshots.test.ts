import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { SnapshotFileDiff, SnapshotSummary } from '#shared/schemas/snapshot'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const base = '/api/books/sample-book'
const post = (path: string, body: unknown) => fetch(`${base}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const ARRIVAL = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
const doc = () => $fetch<{ body: string, hash: string }>(`${base}/document`, { query: { path: ARRIVAL } })

describe('snapshots API', () => {
  it('takes, lists, compares, restores (undoably) and deletes snapshots', async () => {
    const created = await post('/snapshots', { name: 'Draft 1', entryId: 'scn_arr1val001' })
    expect(created.status).toBe(201)
    const snapshot = await created.json() as SnapshotSummary
    expect(snapshot).toMatchObject({ name: 'Draft 1', fileCount: 1, auto: false })
    expect((await $fetch<SnapshotSummary[]>(`${base}/snapshots`, { query: { path: ARRIVAL } })).map(s => s.id)).toEqual([snapshot.id])

    const original = (await doc()).body
    await $fetch(`${base}/document`, { method: 'PUT', body: { path: ARRIVAL, body: 'Gone.\n' } })
    const [diff] = await $fetch<SnapshotFileDiff[]>(`${base}/snapshots/${snapshot.id}/diff`)
    expect(diff).toMatchObject({ path: ARRIVAL, after: expect.stringContaining('Gone.') })

    expect((await post(`/snapshots/${snapshot.id}/restore`, { path: ARRIVAL, expectedHash: 'stale' })).status).toBe(409)
    const restored = await (await post(`/snapshots/${snapshot.id}/restore`, {})).json() as { restored: string[], activity: { id: string } }
    expect(restored.restored).toEqual([ARRIVAL])
    expect((await doc()).body).toBe(original)
    expect((await post(`/activity/${restored.activity.id}/undo`, {})).status).toBe(200)
    expect((await doc()).body).toBe('Gone.\n')

    expect((await fetch(`${base}/snapshots/${snapshot.id}`, { method: 'DELETE' })).status).toBe(204)
    expect((await fetch(`${base}/snapshots/${snapshot.id}/diff`)).status).toBe(404)
  })

  it('validates input', async () => {
    expect((await post('/snapshots', { name: '' })).status).toBe(400)
    expect((await post('/snapshots', { name: 'x', entryId: 'scn_missing001' })).status).toBe(404)
  })
})
