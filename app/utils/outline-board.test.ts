import { describe, expect, it } from 'vitest'
import type { Outline } from '#shared/schemas/outline'
import { moveForDrop, stepMove } from './outline-board'

const beat = (id: string) => ({ id, title: id, summary: '', scenes: [] })
const outline: Outline = { notes: '', acts: [{ id: 'act_1', title: 'One', beats: [beat('bt_a'), beat('bt_b'), beat('bt_c')] }, { id: 'act_2', title: 'Two', beats: [] }] }

describe('board moves', () => {
  it('turns drops into moves, accounting for the dragged card leaving its column', () => {
    expect(moveForDrop(outline, 'bt_a', { actId: 'act_1', beforeBeatId: 'bt_c' })).toEqual({ op: 'moveBeat', beatId: 'bt_a', actId: 'act_1', index: 1 })
    expect(moveForDrop(outline, 'bt_c', { actId: 'act_1', beforeBeatId: 'bt_a' })).toEqual({ op: 'moveBeat', beatId: 'bt_c', actId: 'act_1', index: 0 })
    expect(moveForDrop(outline, 'bt_b', { actId: 'act_2', beforeBeatId: null })).toEqual({ op: 'moveBeat', beatId: 'bt_b', actId: 'act_2', index: 0 })
  })

  it('ignores drops that change nothing', () => {
    expect(moveForDrop(outline, 'bt_a', { actId: 'act_1', beforeBeatId: 'bt_b' })).toBeNull()
    expect(moveForDrop(outline, 'bt_c', { actId: 'act_1', beforeBeatId: null })).toBeNull()
    expect(moveForDrop(outline, 'bt_a', { actId: 'act_1', beforeBeatId: 'bt_a' })).toBeNull()
  })

  it('moves one step with the keyboard, stopping at the edges', () => {
    expect(stepMove(outline, 'bt_b', 'up')).toMatchObject({ actId: 'act_1', index: 0 })
    expect(stepMove(outline, 'bt_c', 'down')).toBeNull()
    expect(stepMove(outline, 'bt_a', 'nextAct')).toEqual({ op: 'moveBeat', beatId: 'bt_a', actId: 'act_2', index: 0 })
    expect(stepMove(outline, 'bt_a', 'previousAct')).toBeNull()
  })
})
