/** Characters of surrounding text stored with an anchor to tell repeated passages apart. */
export const ANCHOR_CONTEXT = 48

export interface TextRange {
  from: number
  to: number
}

function commonSuffix(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++
  return n
}

function commonPrefix(a: string, b: string): number {
  let n = 0
  while (n < a.length && n < b.length && a[n] === b[n]) n++
  return n
}

/** The text around a range, stored so the range can be found again later (`locateAnchor`). */
export function anchorContext(text: string, range: TextRange, size = ANCHOR_CONTEXT): { before: string, after: string } {
  return { before: text.slice(Math.max(0, range.from - size), range.from), after: text.slice(range.to, range.to + size) }
}

/**
 * Finds `find` in `text` again. One occurrence wins outright; with several, the one whose surroundings best
 * match the stored `before`/`after` context wins (ties: the first). `null` when the passage is gone – the
 * anchor is stale.
 */
export function locateAnchor(text: string, find: string, context: { before?: string, after?: string } = {}): TextRange | null {
  if (!find) return null
  const starts: number[] = []
  for (let at = text.indexOf(find); at >= 0; at = text.indexOf(find, at + 1)) starts.push(at)
  if (!starts.length) return null
  let best = starts[0]!
  let bestScore = -1
  for (const start of starts) {
    const score = commonSuffix(text.slice(0, start), context.before ?? '') + commonPrefix(text.slice(start + find.length), context.after ?? '')
    if (score > bestScore) {
      best = start
      bestScore = score
    }
  }
  return { from: best, to: best + find.length }
}

/** Characters of a quote or its context that must still match for a fuzzy re-anchor. */
const PROBE = 16
const occurrences = (text: string, part: string) => {
  const found: number[] = []
  for (let at = text.indexOf(part); at >= 0; at = text.indexOf(part, at + 1)) found.push(at)
  return found
}

/**
 * Like `locateAnchor`, but survives edits inside the passage: when the exact quote is gone, it is found again
 * between its unchanged surroundings, or between its unchanged first and last words. The length may change
 * by half at most (plus a little), so an unrelated passage is not picked up. `null`: the passage is gone –
 * the finding or comment is orphaned (kept, but shown as detached). Only for display anchors: never replace
 * text at a fuzzy range.
 */
export function locateAnchorFuzzy(text: string, find: string, context: { before?: string, after?: string } = {}): TextRange | null {
  const exact = locateAnchor(text, find, context)
  if (exact || !find) return exact
  const plausible = (from: number, to: number) => to > from && to - from >= find.length * 0.5 && to - from <= find.length * 1.5 + 40
  const before = (context.before ?? '').slice(-PROBE)
  const after = (context.after ?? '').slice(0, PROBE)
  if (before.length >= 8 && after.length >= 8) {
    for (const at of occurrences(text, before)) {
      const from = at + before.length
      const to = text.indexOf(after, from)
      if (to >= 0 && plausible(from, to)) return { from, to }
    }
  }
  if (find.length >= PROBE * 2) {
    const head = find.slice(0, PROBE)
    const tail = find.slice(-PROBE)
    for (const from of occurrences(text, head)) {
      const end = text.indexOf(tail, from + head.length)
      if (end >= 0 && plausible(from, end + tail.length)) return { from, to: end + tail.length }
    }
  }
  return null
}
