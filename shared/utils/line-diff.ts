export interface DiffLine {
  kind: 'same' | 'added' | 'removed'
  text: string
}

/** Above this many line pairs the LCS table gets too big: show everything as removed + added. */
const MAX_CELLS = 1_000_000

const lines = (text: string | null) => (text === null || text === '' ? [] : text.replace(/\n$/, '').split('\n'))

/** Line diff (LCS) of two file versions; `null` is a file that did not exist. */
export function diffLines(before: string | null, after: string | null): DiffLine[] {
  const a = lines(before)
  const b = lines(after)
  if (a.length * b.length > MAX_CELLS) {
    return [...a.map(text => ({ kind: 'removed' as const, text })), ...b.map(text => ({ kind: 'added' as const, text }))]
  }
  // lengths[i][j] = LCS of a[i..] and b[j..]
  const lengths = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
    }
  }
  const result: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      result.push({ kind: 'same', text: a[i++]! })
      j++
    }
    // Removals first on ties, so a replaced line reads "- old / + new".
    else if (i < a.length && (j >= b.length || lengths[i + 1]![j]! >= lengths[i]![j + 1]!)) result.push({ kind: 'removed', text: a[i++]! })
    else result.push({ kind: 'added', text: b[j++]! })
  }
  return result
}

/** Only the changed lines with `context` unchanged lines around them; skipped runs become `null`. */
export function diffHunks(diff: DiffLine[], context = 2): (DiffLine | null)[] {
  const keep = diff.map((line, index) => diff.slice(Math.max(0, index - context), index + context + 1).some(l => l.kind !== 'same') || line.kind !== 'same')
  const result: (DiffLine | null)[] = []
  diff.forEach((line, index) => {
    if (keep[index]) result.push(line)
    else if (result.at(-1) !== null) result.push(null)
  })
  return result
}
