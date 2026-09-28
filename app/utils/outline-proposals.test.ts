import { describe, expect, it } from 'vitest'
import type { Outline } from '#shared/schemas/outline'
import type { OutlineChange, OutlineProposal } from '#shared/schemas/outline-proposals'
import { placeProposals, proposalSlot } from './outline-proposals'

const outline: Outline = { notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }, { id: 'bt_b', title: 'B', summary: '', scenes: [] }] }] }
const proposal = (id: string, change: OutlineChange): OutlineProposal => ({ id, change, rationale: '', source: '', author: { kind: 'assistant', name: 'A' }, model: null, status: 'pending', createdAt: '2026-01-01T00:00:00.000Z' })

describe('placeProposals', () => {
  it('places beats after their anchor, edits after their beat, and the rest in the list', () => {
    const first = proposal('opr_1', { kind: 'addBeat', actId: 'act_1', afterBeatId: null, title: 'Start', summary: '' })
    const bridge = proposal('opr_2', { kind: 'addBeat', actId: 'act_1', afterBeatId: 'bt_a', title: 'Bridge', summary: '' })
    const moved = proposal('opr_3', { kind: 'addBeat', actId: 'act_1', afterBeatId: 'bt_gone', title: 'Late', summary: '' })
    const edit = proposal('opr_4', { kind: 'updateBeat', beatId: 'bt_b', summary: 'Sharper.' })
    const note = proposal('opr_5', { kind: 'note', text: 'Hole.' })
    const orphan = proposal('opr_6', { kind: 'addBeat', actId: 'act_gone', afterBeatId: null, title: 'X', summary: '' })
    const { slots, loose } = placeProposals(outline, [first, bridge, moved, edit, note, orphan])
    expect(slots.get(proposalSlot('act_1', null))).toEqual([first])
    expect(slots.get(proposalSlot('act_1', 'bt_a'))).toEqual([bridge])
    expect(slots.get(proposalSlot('act_1', 'bt_b'))).toEqual([moved, edit])
    expect(loose).toEqual([note, orphan])
  })
})
