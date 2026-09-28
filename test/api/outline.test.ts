import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { BeatSheetList, OutlineDocument } from '#shared/schemas/outline'
import { beatSheetOps } from '../../shared/utils/beat-sheet'
import { createRecordId } from '../../shared/utils/ids'
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

describe('scenes from beats', () => {
  it('creates a scene from a beat in a chapter and links it', async () => {
    const res = await fetch(`${base}/outline/beats/bt_themap0001/scene`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapterId: 'chp_gu1ld00001' }) })
    expect(res.status).toBe(201)
    const { sceneId } = await res.json() as { sceneId: string }
    expect(await $fetch(`${base}/beats`, { query: { sceneId } })).toMatchObject([{ id: 'bt_themap0001' }])
    expect((await fetch(`${base}/outline/beats/bt_themap0001/scene`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapterId: 'nope' }) })).status).toBe(400)
  })
})

describe('beat-sheet templates', () => {
  it('lists the workspace templates and merges one into the outline without touching existing beats', async () => {
    const { folder, sheets } = await $fetch<BeatSheetList>('/api/templates/beat-sheets')
    expect(folder).toBe(`${workspace}/templates/beat-sheets`)
    const threeActs = sheets.find(sheet => sheet.id === 'three-acts')!
    const before = await $fetch<OutlineDocument>(`${base}/outline`)
    const edits = beatSheetOps(before.outline, threeActs.outline, prefix => createRecordId(prefix, 10))
    const res = await ops({ ops: edits, expectedHash: before.hash })
    expect(res.status).toBe(200)
    const after = (await res.json() as OutlineDocument).outline
    const beatIds = (outline: OutlineDocument['outline']) => outline.acts.flatMap(act => act.beats.map(beat => beat.id))
    expect(beatIds(after)).toEqual(expect.arrayContaining(beatIds(before.outline)))
    expect(after.acts.flatMap(act => act.beats)).toHaveLength(beatIds(before.outline).length + 8)
  })
})
