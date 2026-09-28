import { describe, expect, it } from 'vitest'
import type { Outline } from '../schemas/outline'
import { applyOutlineOps, OutlineOpError } from './outline-ops'

const outline = (): Outline => ({
  notes: '',
  acts: [
    { id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }, { id: 'bt_b', title: 'B', summary: '', scenes: [] }] },
    { id: 'act_2', title: 'Two', beats: [] },
  ],
})
let n = 0
const newId = (prefix: string) => `${prefix}_new${++n}`
const titles = (o: Outline) => o.acts.map(act => `${act.title}: ${act.beats.map(beat => beat.title).join(',')}`)

describe('applyOutlineOps', () => {
  it('moves beats between acts and reorders them (board drag & drop), without touching the input', () => {
    const before = outline()
    const after = applyOutlineOps(before, [{ op: 'moveBeat', beatId: 'bt_b', actId: 'act_2', index: 0 }, { op: 'moveBeat', beatId: 'bt_a', actId: 'act_2', index: 5 }], newId)
    expect(titles(after)).toEqual(['One: ', 'Two: B,A'])
    expect(titles(before)).toEqual(['One: A,B', 'Two: '])
  })

  it('adds, renames, updates, reorders and deletes', () => {
    const after = applyOutlineOps(outline(), [
      { op: 'addAct', title: 'Three' },
      { op: 'addBeat', actId: 'act_1', title: 'Start', summary: '', index: 0 },
      { op: 'renameAct', actId: 'act_2', title: 'Middle' },
      { op: 'updateBeat', beatId: 'bt_b', summary: 'Storm.', scenes: ['scn_1', 'scn_1'] },
      { op: 'moveAct', actId: 'act_2', index: 0 },
      { op: 'deleteBeat', beatId: 'bt_a' },
    ], newId)
    expect(titles(after)).toEqual(['Middle: ', 'One: Start,B', 'Three: '])
    expect(after.acts[1]!.beats[1]).toMatchObject({ summary: 'Storm.', scenes: ['scn_1'] })
    expect(after.acts[2]!.id).toMatch(/^act_new/)
  })

  it('rejects unknown acts and beats', () => {
    expect(() => applyOutlineOps(outline(), [{ op: 'deleteBeat', beatId: 'bt_zzz' }], newId)).toThrow(OutlineOpError)
  })
})
