import type { Outline } from '#shared/schemas/outline'
import type { OutlineProposal } from '#shared/schemas/outline-proposals'

const slot = (actId: string, afterBeatId: string | null) => `${actId}|${afterBeatId ?? ''}`

export interface ProposalPlacement {
  /** Ghost cards on the board, keyed by act and the beat they follow (`null`: first in the act). */
  slots: Map<string, OutlineProposal[]>
  /** Notes, and proposals whose act or beat is gone: listed above the outline instead. */
  loose: OutlineProposal[]
}

/**
 * Where pending proposals show: a new beat after its anchor beat (at the end of the act if the anchor moved
 * away), a suggested edit right after the beat it changes, notes in the list above the outline.
 */
export function placeProposals(outline: Outline, proposals: OutlineProposal[]): ProposalPlacement {
  const slots = new Map<string, OutlineProposal[]>()
  const loose: OutlineProposal[] = []
  const put = (key: string, proposal: OutlineProposal) => slots.set(key, [...(slots.get(key) ?? []), proposal])
  for (const proposal of proposals) {
    const { change } = proposal
    if (change.kind === 'addBeat') {
      const act = outline.acts.find(candidate => candidate.id === change.actId)
      if (!act) loose.push(proposal)
      else if (!change.afterBeatId || act.beats.some(beat => beat.id === change.afterBeatId)) put(slot(act.id, change.afterBeatId), proposal)
      else put(slot(act.id, act.beats.at(-1)?.id ?? null), proposal)
    }
    else if (change.kind === 'updateBeat') {
      const act = outline.acts.find(candidate => candidate.beats.some(beat => beat.id === change.beatId))
      if (act) put(slot(act.id, change.beatId), proposal)
      else loose.push(proposal)
    }
    else loose.push(proposal)
  }
  return { slots, loose }
}

export const proposalSlot = slot
