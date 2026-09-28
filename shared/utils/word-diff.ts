export const words = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []

/** Longest common subsequence length of two word lists (two-row DP). */
export function lcs(a: string[], b: string[]): number {
  let previous = new Array<number>(b.length + 1).fill(0)
  for (const word of a) {
    const current = new Array<number>(b.length + 1).fill(0)
    for (let j = 1; j <= b.length; j++) current[j] = word === b[j - 1] ? previous[j - 1]! + 1 : Math.max(previous[j]!, current[j - 1]!)
    previous = current
  }
  return previous[b.length]!
}

/**
 * How much of a passage was rewritten, by words in order: 0 = unchanged, 1 = nothing left. Typos in one word
 * count as one changed word; moving sentences around counts as change.
 */
export function wordChangeRatio(original: string, current: string): number {
  const a = words(original)
  const b = words(current)
  if (!a.length && !b.length) return 0
  if (!a.length || !b.length) return 1
  // Guard against huge passages: compare the first 2,000 words.
  return 1 - lcs(a.slice(0, 2000), b.slice(0, 2000)) / Math.max(a.length, b.length)
}
