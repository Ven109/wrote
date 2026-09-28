import type { Act, Beat, Outline } from '../schemas/outline'

/**
 * `outline.md` body format – readable and editable anywhere:
 *
 *     Free notes …
 *
 *     ## Act title
 *
 *     <!-- wrote:act id=act_… -->
 *
 *     ### Beat title
 *
 *     <!-- wrote:beat id=bt_… scenes=scn_a,scn_b -->
 *
 *     Summary paragraphs …
 *
 * Everything before the first `## ` heading is notes. Markers are HTML comments (invisible when rendered) on
 * their own paragraph, so the editor keeps them;
 * headings written by hand without a marker get an id when the outline is next saved.
 */
const ACT = /^##\s+(.+?)\s*$/
const BEAT = /^###\s+(.+?)\s*$/
const MARKER = /^<!--\s*wrote:(act|beat)\s+([^>]*?)\s*-->\s*$/

function attrs(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/([a-z]+)=(\S+)/g)].map(match => [match[1]!, match[2]!]))
}

/** The marker on the first non-empty line after `index`, and the line it is on. */
function markerAfter(lines: string[], index: number, kind: 'act' | 'beat'): { attrs: Record<string, string>, line: number } | null {
  let line = index + 1
  while (line < lines.length && !lines[line]!.trim()) line++
  const match = line < lines.length ? MARKER.exec(lines[line]!) : null
  return match && match[1] === kind ? { attrs: attrs(match[2]!), line } : null
}

export function parseOutline(body: string): Outline {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const firstAct = lines.findIndex(line => ACT.test(line))
  const notes = (firstAct < 0 ? lines : lines.slice(0, firstAct)).join('\n').trim()
  const acts: Act[] = []
  const summaries = new Map<Beat, string[]>()
  let current: Beat | null = null
  for (let i = firstAct < 0 ? lines.length : firstAct; i < lines.length; i++) {
    const line = lines[i]!
    const act = ACT.exec(line)
    const heading = act ? null : BEAT.exec(line)
    if (act) {
      const marker = markerAfter(lines, i, 'act')
      if (marker) i = marker.line
      acts.push({ id: marker?.attrs.id ?? '', title: act[1]!, beats: [] })
      current = null
    }
    else if (heading) {
      const marker = markerAfter(lines, i, 'beat')
      if (marker) i = marker.line
      current = { id: marker?.attrs.id ?? '', title: heading[1]!, summary: '', scenes: marker?.attrs.scenes?.split(',').filter(Boolean) ?? [] }
      acts.at(-1)!.beats.push(current)
      summaries.set(current, [])
    }
    else if (current) summaries.get(current)!.push(line)
  }
  for (const [beat, summary] of summaries) beat.summary = summary.join('\n').trim()
  return { notes, acts }
}

export function serializeOutline(outline: Outline): string {
  const parts: string[] = []
  if (outline.notes.trim()) parts.push(outline.notes.trim())
  for (const act of outline.acts) {
    parts.push(`## ${act.title}`, `<!-- wrote:act id=${act.id} -->`)
    for (const beat of act.beats) {
      const scenes = beat.scenes.length ? ` scenes=${beat.scenes.join(',')}` : ''
      parts.push(`### ${beat.title}`, `<!-- wrote:beat id=${beat.id}${scenes} -->`)
      if (beat.summary.trim()) parts.push(beat.summary.trim())
    }
  }
  return parts.length ? `${parts.join('\n\n')}\n` : ''
}

/** Gives hand-written acts and beats (no marker yet) an id. Returns whether anything changed. */
export function ensureOutlineIds(outline: Outline, newId: (prefix: 'act' | 'bt') => string): boolean {
  let changed = false
  for (const act of outline.acts) {
    if (!act.id) [act.id, changed] = [newId('act'), true]
    for (const beat of act.beats) if (!beat.id) [beat.id, changed] = [newId('bt'), true]
  }
  return changed
}
