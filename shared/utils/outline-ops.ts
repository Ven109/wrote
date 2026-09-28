import type { Act, Beat, Outline, OutlineOp } from '../schemas/outline'

export class OutlineOpError extends Error {}

const clone = (outline: Outline): Outline => ({ notes: outline.notes, acts: outline.acts.map(act => ({ ...act, beats: act.beats.map(beat => ({ ...beat, scenes: [...beat.scenes] })) })) })

function actOf(outline: Outline, id: string): Act {
  const act = outline.acts.find(candidate => candidate.id === id)
  if (!act) throw new OutlineOpError(`Unknown act ${id}`)
  return act
}

function beatOf(outline: Outline, id: string): { act: Act, beat: Beat, index: number } {
  for (const act of outline.acts) {
    const index = act.beats.findIndex(beat => beat.id === id)
    if (index >= 0) return { act, beat: act.beats[index]!, index }
  }
  throw new OutlineOpError(`Unknown beat ${id}`)
}

const insertAt = <T>(list: T[], item: T, index = list.length) => list.splice(Math.min(index, list.length), 0, item)

function apply(outline: Outline, op: OutlineOp, newId: (prefix: 'act' | 'bt') => string): void {
  switch (op.op) {
    case 'addAct': return void insertAt(outline.acts, { id: op.id ?? newId('act'), title: op.title, beats: [] }, op.index)
    case 'renameAct': return void (actOf(outline, op.actId).title = op.title)
    case 'deleteAct': return void (outline.acts = outline.acts.filter(act => act !== actOf(outline, op.actId)))
    case 'moveAct': {
      const act = actOf(outline, op.actId)
      outline.acts.splice(outline.acts.indexOf(act), 1)
      return void insertAt(outline.acts, act, op.index)
    }
    case 'addBeat': return void insertAt(actOf(outline, op.actId).beats, { id: op.id ?? newId('bt'), title: op.title, summary: op.summary, scenes: [] }, op.index)
    case 'updateBeat': {
      const { beat } = beatOf(outline, op.beatId)
      if (op.title !== undefined) beat.title = op.title
      if (op.summary !== undefined) beat.summary = op.summary
      if (op.scenes !== undefined) beat.scenes = [...new Set(op.scenes)]
      return
    }
    case 'deleteBeat': {
      const { act, index } = beatOf(outline, op.beatId)
      return void act.beats.splice(index, 1)
    }
    case 'moveBeat': {
      const target = actOf(outline, op.actId)
      const { act, beat, index } = beatOf(outline, op.beatId)
      act.beats.splice(index, 1)
      return void insertAt(target.beats, beat, op.index)
    }
    case 'setNotes': return void (outline.notes = op.notes)
  }
}

/** Applies edits to a copy of the outline (pure; the client uses it for optimistic updates too). */
export function applyOutlineOps(outline: Outline, ops: OutlineOp[], newId: (prefix: 'act' | 'bt') => string): Outline {
  const next = clone(outline)
  for (const op of ops) apply(next, op, newId)
  return next
}
