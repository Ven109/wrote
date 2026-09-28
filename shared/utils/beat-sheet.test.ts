import { describe, expect, it } from 'vitest'
import type { Outline } from '../schemas/outline'
import { beatSheetOps, countAdditions } from './beat-sheet'
import { applyOutlineOps } from './outline-ops'

let counter = 0
const newId = (prefix: 'act' | 'bt') => `${prefix}_n${++counter}`

const template: Outline = {
  notes: 'Premise in one sentence.',
  acts: [
    { id: '', title: 'Act One', beats: [{ id: '', title: 'Hook', summary: 'Grab them.', scenes: [] }, { id: '', title: 'Inciting incident', summary: '', scenes: [] }] },
    { id: '', title: 'Act Two', beats: [{ id: '', title: 'Midpoint', summary: 'Stakes rise.', scenes: [] }] },
  ],
}

function merged(outline: Outline) {
  const ops = beatSheetOps(outline, template, newId)
  const result = applyOutlineOps(outline, ops, newId)
  return { ops, result, shape: result.acts.map(act => [act.title, act.beats.map(beat => beat.title)]) }
}

describe('beatSheetOps', () => {
  it('fills an empty outline with the template, notes included', () => {
    const { ops, result, shape } = merged({ notes: '', acts: [] })
    expect(shape).toEqual([['Act One', ['Hook', 'Inciting incident']], ['Act Two', ['Midpoint']]])
    expect(result.notes).toBe('Premise in one sentence.')
    expect(result.acts[0]!.beats[0]!.summary).toBe('Grab them.')
    expect(countAdditions(ops)).toEqual({ acts: 2, beats: 3 })
  })

  it('keeps user beats and adds only what is missing, next to matching beats', () => {
    const outline: Outline = {
      notes: 'Mine.',
      acts: [{ id: 'act_1', title: 'act one', beats: [{ id: 'bt_1', title: 'My opening', summary: 'x', scenes: ['scn_a'] }, { id: 'bt_2', title: 'HOOK', summary: 'own', scenes: [] }] }],
    }
    const { result, shape } = merged(outline)
    expect(shape).toEqual([['act one', ['My opening', 'HOOK', 'Inciting incident']], ['Act Two', ['Midpoint']]])
    expect(result.notes).toBe('Mine.')
    expect(result.acts[0]!.beats[0]).toEqual(outline.acts[0]!.beats[0])
    expect(result.acts[0]!.beats[1]!.summary).toBe('own')
  })

  it('does not duplicate a beat the user moved to another act', () => {
    const outline: Outline = { notes: '', acts: [{ id: 'act_2', title: 'Act Two', beats: [{ id: 'bt_1', title: 'Hook', summary: '', scenes: [] }] }] }
    const { shape } = merged(outline)
    expect(shape).toEqual([['Act One', ['Inciting incident']], ['Act Two', ['Hook', 'Midpoint']]])
  })

  it('appends template acts after unrelated user acts', () => {
    const outline: Outline = { notes: '', acts: [{ id: 'act_x', title: 'Prologue', beats: [] }] }
    expect(merged(outline).shape.map(([title]) => title)).toEqual(['Prologue', 'Act One', 'Act Two'])
  })

  it('adds nothing when applied twice', () => {
    const { result } = merged({ notes: '', acts: [] })
    expect(beatSheetOps(result, template, newId)).toEqual([])
  })
})
