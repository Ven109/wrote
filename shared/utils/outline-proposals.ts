import type { Outline, OutlineOp } from '../schemas/outline'
import type { OutlineChange } from '../schemas/outline-proposals'
import { OutlineOpError } from './outline-ops'

export interface ProposalEdits {
  title?: string
  summary?: string
}

/** Why a proposed change no longer fits the outline (act or beat deleted), or `null` when it does. */
export function changeProblem(outline: Outline, change: OutlineChange): string | null {
  if (change.kind === 'note') return null
  if (change.kind === 'updateBeat') return outline.acts.some(act => act.beats.some(beat => beat.id === change.beatId)) ? null : `Unknown beat ${change.beatId}`
  const act = outline.acts.find(candidate => candidate.id === change.actId)
  if (!act) return `Unknown act ${change.actId}`
  return !change.afterBeatId || act.beats.some(beat => beat.id === change.afterBeatId) ? null : `Beat ${change.afterBeatId} is not in act ${change.actId}`
}

/**
 * The outline edits that accepting a proposal applies, with the author's edits of title and summary. A new
 * beat goes after `afterBeatId` (at the end of the act if that beat moved away since); a note is appended to
 * the outline notes. Throws `OutlineOpError` when the act or beat no longer exists.
 */
export function proposalOps(outline: Outline, change: OutlineChange, edits: ProposalEdits = {}): OutlineOp[] {
  switch (change.kind) {
    case 'addBeat': {
      const act = outline.acts.find(candidate => candidate.id === change.actId)
      if (!act) throw new OutlineOpError('The act of this proposal was deleted')
      const after = change.afterBeatId ? act.beats.findIndex(beat => beat.id === change.afterBeatId) : -1
      const index = change.afterBeatId && after < 0 ? act.beats.length : after + 1
      return [{ op: 'addBeat', actId: act.id, title: edits.title ?? change.title, summary: edits.summary ?? change.summary, index }]
    }
    case 'updateBeat': {
      const problem = changeProblem(outline, change)
      if (problem) throw new OutlineOpError('The beat of this proposal was deleted')
      const title = edits.title ?? change.title
      const summary = edits.summary ?? change.summary
      return [{ op: 'updateBeat', beatId: change.beatId, ...(title !== undefined ? { title } : {}), ...(summary !== undefined ? { summary } : {}) }]
    }
    case 'note': {
      const text = (edits.summary ?? change.text).trim()
      return [{ op: 'setNotes', notes: outline.notes.trim() ? `${outline.notes.trim()}\n\n${text}` : text }]
    }
  }
}
