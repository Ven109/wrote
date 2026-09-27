/**
 * A deterministic stand-in for an embedding model: each dimension is a "concept" (a set of related
 * words), so texts about the same idea are close even without shared words – enough to test semantic
 * search end to end without a real model.
 */
export const CONCEPTS: string[][] = [
  ['guilt', 'guilty', 'shame', 'ashamed', 'remorse', 'blame', 'eye', 'look', 'nobody', 'avoid'],
  ['sea', 'tide', 'harbor', 'salt', 'bay', 'water', 'ocean', 'shore'],
  ['map', 'father', 'drawer', 'creases', 'folded', 'chart'],
  ['home', 'return', 'back', 'promised', 'never', 'come'],
  ['light', 'lighthouse', 'lamp', 'lantern'],
]

const words = (text: string) => text.toLowerCase().match(/\p{L}+/gu) ?? []

export function conceptVector(text: string): number[] {
  const vector = CONCEPTS.map(() => 0)
  for (const word of words(text)) {
    CONCEPTS.forEach((concept, i) => {
      if (concept.includes(word)) vector[i]! += 1
    })
  }
  // A small constant keeps vectors of concept-free text non-zero (cosine distance needs a direction).
  return [...vector, 0.1]
}

export const fakeEmbed = async (values: string[]) => values.map(conceptVector)
