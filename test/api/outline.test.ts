import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { OutlineDocument } from '#shared/schemas/outline'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const base = '/api/books/sample-book'
const ops = (body: unknown) => fetch(`${base}/outline/ops`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('outline API', () => {
  it('reads the outline, applies edits with conflict detection, and indexes beats', async () => {
    const { outline, hash } = await $fetch<OutlineDocument>(`${base}/outline`)
    expect(outline.acts.map(act => act.beats.length)).toEqual([2, 1])
    const moved = await ops({ ops: [{ op: 'moveBeat', beatId: 'bt_0ffer00001', actId: 'act_0ne0000001', index: 0 }], expectedHash: hash })
    expect(moved.status).toBe(200)
    expect((await moved.json() as OutlineDocument).outline.acts[0]!.beats[0]!.id).toBe('bt_0ffer00001')
    expect((await ops({ ops: [{ op: 'setNotes', notes: 'x' }], expectedHash: hash })).status).toBe(409)
    expect((await ops({ ops: [{ op: 'deleteBeat', beatId: 'bt_nope' }] })).status).toBe(400)
    expect((await ops({ ops: [{ op: 'explode' }] })).status).toBe(400)
    expect(await $fetch(`${base}/beats`, { query: { sceneId: 'scn_arr1val001' } })).toMatchObject([{ id: 'bt_arr1va0001', title: 'Mara returns to Hollow Bay' }])
  })
})
