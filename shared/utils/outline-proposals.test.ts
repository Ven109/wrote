import { describe, expect, it } from 'vitest'
import type { Outline } from '../schemas/outline'
import { OutlineOpError } from './outline-ops'
import { changeProblem, proposalOps } from './outline-proposals'

const outline: Outline = {
  notes: 'Premise.',
  acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }, { id: 'bt_b', title: 'B', summary: '', scenes: [] }] }],
}

describe('proposalOps', () => {
  it('adds a beat after its anchor, first in the act, or at the end when the anchor moved away', () => {
    const change = { kind: 'addBeat' as const, actId: 'act_1', afterBeatId: 'bt_a', title: 'Bridge', summary: 'Then.' }
    expect(proposalOps(outline, change)).toEqual([{ op: 'addBeat', actId: 'act_1', title: 'Bridge', summary: 'Then.', index: 1 }])
    expect(proposalOps(outline, { ...change, afterBeatId: null })[0]).toMatchObject({ index: 0 })
    expect(proposalOps(outline, { ...change, afterBeatId: 'bt_gone' })[0]).toMatchObject({ index: 2 })
    expect(proposalOps(outline, change, { title: 'Edited' })[0]).toMatchObject({ title: 'Edited', summary: 'Then.' })
  })

  it('edits only the proposed fields of a beat and appends notes', () => {
    expect(proposalOps(outline, { kind: 'updateBeat', beatId: 'bt_b', summary: 'New.' })).toEqual([{ op: 'updateBeat', beatId: 'bt_b', summary: 'New.' }])
    expect(proposalOps(outline, { kind: 'note', text: 'Why does she stay?' })).toEqual([{ op: 'setNotes', notes: 'Premise.\n\nWhy does she stay?' }])
    expect(proposalOps({ notes: '', acts: [] }, { kind: 'note', text: 'Hole.' })).toEqual([{ op: 'setNotes', notes: 'Hole.' }])
  })

  it('rejects changes to deleted acts and beats', () => {
    expect(() => proposalOps(outline, { kind: 'addBeat', actId: 'act_x', afterBeatId: null, title: 'T', summary: '' })).toThrow(OutlineOpError)
    expect(() => proposalOps(outline, { kind: 'updateBeat', beatId: 'bt_x', title: 'T' })).toThrow(OutlineOpError)
    expect(changeProblem(outline, { kind: 'addBeat', actId: 'act_1', afterBeatId: 'bt_x', title: 'T', summary: '' })).toMatch(/not in act/)
    expect(changeProblem(outline, { kind: 'note', text: 'x' })).toBeNull()
  })
})
