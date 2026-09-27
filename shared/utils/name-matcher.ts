/** A name to detect (codex title or alias) and the entry it belongs to. */
export interface MatchName {
  name: string
  entryId: string
}

export interface NameMatch {
  from: number
  to: number
  entryId: string
}

interface Node {
  next: Map<string, number>
  fail: number
  /** Patterns ending here: [length, entryId]. */
  out: [number, string][]
}

const isWordChar = (char: string | undefined) => char !== undefined && /[\p{L}\p{N}_-]/u.test(char)

/**
 * Aho–Corasick matcher over lower-cased names: finds all names in a text in one pass (O(text + matches)),
 * independent of how many codex entries exist. Matches must start and end at word boundaries; overlapping
 * matches resolve to the longest leftmost one ("Mara Velden" wins over "Mara").
 */
export function createNameMatcher(names: MatchName[]) {
  const nodes: Node[] = [{ next: new Map(), fail: 0, out: [] }]
  for (const { name, entryId } of names) {
    const pattern = name.trim().toLowerCase()
    if (pattern.length < 2) continue
    let state = 0
    for (const char of pattern) {
      let target = nodes[state]!.next.get(char)
      if (target === undefined) {
        target = nodes.push({ next: new Map(), fail: 0, out: [] }) - 1
        nodes[state]!.next.set(char, target)
      }
      state = target
    }
    nodes[state]!.out.push([[...pattern].length, entryId])
  }
  // Breadth-first failure links.
  const queue: number[] = [...nodes[0]!.next.values()]
  while (queue.length) {
    const state = queue.shift()!
    for (const [char, target] of nodes[state]!.next) {
      let fail = nodes[state]!.fail
      while (fail !== 0 && !nodes[fail]!.next.has(char)) fail = nodes[fail]!.fail
      const candidate = nodes[fail]!.next.get(char)
      nodes[target]!.fail = candidate !== undefined && candidate !== target ? candidate : 0
      nodes[target]!.out.push(...nodes[nodes[target]!.fail]!.out)
      queue.push(target)
    }
  }

  /** All non-overlapping, word-bounded matches in `text` (positions are UTF-16 offsets). */
  function find(text: string): NameMatch[] {
    const chars = [...text.toLowerCase()]
    const offsets: number[] = []
    let offset = 0
    for (const char of chars) {
      offsets.push(offset)
      offset += char.length
    }
    offsets.push(offset)
    const raw: NameMatch[] = []
    let state = 0
    chars.forEach((char, index) => {
      while (state !== 0 && !nodes[state]!.next.has(char)) state = nodes[state]!.fail
      state = nodes[state]!.next.get(char) ?? 0
      for (const [length, entryId] of nodes[state]!.out) {
        const start = index - length + 1
        if (isWordChar(chars[start - 1]) || isWordChar(chars[index + 1])) continue
        raw.push({ from: offsets[start]!, to: offsets[index + 1]!, entryId })
      }
    })
    raw.sort((a, b) => a.from - b.from || b.to - a.to)
    const result: NameMatch[] = []
    for (const match of raw) {
      if (result.length && match.from < result.at(-1)!.to) continue
      result.push(match)
    }
    return result
  }

  return { find, size: names.length }
}

export type NameMatcher = ReturnType<typeof createNameMatcher>
