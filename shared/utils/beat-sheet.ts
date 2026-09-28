import type { Outline, OutlineOp } from '../schemas/outline'

const key = (title: string) => title.trim().toLowerCase()

/** Where the next new item goes: after the first existing match, or at the end when nothing matches. */
function startCursor(titles: string[], wanted: string[]): number {
  const first = titles.findIndex(title => wanted.includes(key(title)))
  return first >= 0 ? first - 1 : titles.length - 1
}

/**
 * The edits that merge a beat-sheet template into an outline: acts and beats missing from the outline are
 * added in template order next to the ones that match; nothing is removed or changed. Acts match by title,
 * beats by title anywhere in the outline (a beat moved to another act still counts). Template notes fill
 * empty outline notes. Pure – the client previews and applies the same edits.
 */
export function beatSheetOps(outline: Outline, template: Outline, newId: (prefix: 'act' | 'bt') => string): OutlineOp[] {
  const ops: OutlineOp[] = []
  if (!outline.notes.trim() && template.notes.trim()) ops.push({ op: 'setNotes', notes: template.notes.trim() })
  const acts = outline.acts.map(act => ({ id: act.id, title: act.title, beats: act.beats.map(beat => beat.title) }))
  const known = new Set(outline.acts.flatMap(act => act.beats.map(beat => key(beat.title))))
  let actCursor = startCursor(acts.map(act => act.title), template.acts.map(act => key(act.title)))
  for (const templateAct of template.acts) {
    let index = acts.findIndex(act => key(act.title) === key(templateAct.title))
    if (index < 0) {
      index = actCursor + 1
      const id = newId('act')
      acts.splice(index, 0, { id, title: templateAct.title, beats: [] })
      ops.push({ op: 'addAct', id, title: templateAct.title, index })
    }
    actCursor = index
    const act = acts[index]!
    let beatCursor = startCursor(act.beats, templateAct.beats.map(beat => key(beat.title)))
    for (const beat of templateAct.beats) {
      const existing = act.beats.findIndex(title => key(title) === key(beat.title))
      if (existing >= 0) beatCursor = existing
      if (known.has(key(beat.title))) continue
      known.add(key(beat.title))
      beatCursor++
      act.beats.splice(beatCursor, 0, beat.title)
      ops.push({ op: 'addBeat', id: newId('bt'), actId: act.id, title: beat.title, summary: beat.summary, index: beatCursor })
    }
  }
  return ops
}

/** How many acts and beats applying a template adds (for the picker's preview). */
export function countAdditions(ops: OutlineOp[]): { acts: number, beats: number } {
  return { acts: ops.filter(op => op.op === 'addAct').length, beats: ops.filter(op => op.op === 'addBeat').length }
}
