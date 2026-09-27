const SHINGLE = 3

/** Word trigrams of a text (lower-cased); short texts yield their words as single shingles. */
export function shingles(text: string): Set<string> {
  const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  if (words.length < SHINGLE) return new Set(words)
  const result = new Set<string>()
  for (let i = 0; i <= words.length - SHINGLE; i++) result.add(words.slice(i, i + SHINGLE).join(' '))
  return result
}

export interface TextChange {
  /** Jaccard distance of the trigram sets: 0 = same, 1 = nothing in common. */
  distance: number
  /** Trigrams added or removed. */
  changed: number
}

export function measureChange(before: string, after: string): TextChange {
  const a = shingles(before)
  const b = shingles(after)
  let common = 0
  for (const shingle of a) if (b.has(shingle)) common++
  const union = a.size + b.size - common
  return { distance: union ? 1 - common / union : 0, changed: union - common }
}

/**
 * Whether an edit is big enough to redo a summary: at least 10 % of the text's trigrams differ and at
 * least 12 changed trigrams (≈ a sentence) – so typo fixes never count, rewriting a paragraph does.
 */
export function isSignificantChange(before: string, after: string, options: { minDistance?: number, minChanged?: number } = {}): boolean {
  const change = measureChange(before, after)
  return change.distance >= (options.minDistance ?? 0.1) && change.changed >= (options.minChanged ?? 12)
}
