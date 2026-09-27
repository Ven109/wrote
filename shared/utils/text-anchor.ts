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
