import type { Outline, OutlineOp } from '#shared/schemas/outline'

export interface BeatDrop {
  actId: string
  /** The card the beat goes before; `null` = end of the column. */
  beforeBeatId: string | null
}

/** The `moveBeat` for a drop, or `null` when it would change nothing. */
export function moveForDrop(outline: Outline, beatId: string, drop: BeatDrop): OutlineOp | null {
  const act = outline.acts.find(candidate => candidate.id === drop.actId)
  if (!act || drop.beforeBeatId === beatId) return null
  const others = act.beats.filter(beat => beat.id !== beatId)
  const index = drop.beforeBeatId ? others.findIndex(beat => beat.id === drop.beforeBeatId) : others.length
  if (index < 0) return null
  const current = act.beats.findIndex(beat => beat.id === beatId)
  return current === index ? null : { op: 'moveBeat', beatId, actId: act.id, index }
}

export type BeatDirection = 'up' | 'down' | 'previousAct' | 'nextAct'

/** Keyboard / touch alternative to dragging: move a beat one step. `null` at the edges. */
export function stepMove(outline: Outline, beatId: string, direction: BeatDirection): OutlineOp | null {
  const actIndex = outline.acts.findIndex(act => act.beats.some(beat => beat.id === beatId))
  if (actIndex < 0) return null
  const act = outline.acts[actIndex]!
  const index = act.beats.findIndex(beat => beat.id === beatId)
  if (direction === 'up') return index > 0 ? { op: 'moveBeat', beatId, actId: act.id, index: index - 1 } : null
  if (direction === 'down') return index < act.beats.length - 1 ? { op: 'moveBeat', beatId, actId: act.id, index: index + 1 } : null
  const target = outline.acts[actIndex + (direction === 'nextAct' ? 1 : -1)]
  return target ? { op: 'moveBeat', beatId, actId: target.id, index: target.beats.length } : null
}
