export interface MarginItem {
  id: string
  /** Where the card would like to be: level with its passage (px from the margin's top). */
  top: number
}

/**
 * Places margin cards level with their passages without overlapping: in passage order, each card goes to
 * its passage or just below the previous card. Unknown heights count as `fallbackHeight`.
 */
export function stackCards(items: MarginItem[], heights: Record<string, number>, gap = 8, fallbackHeight = 96): Record<string, number> {
  const placed: Record<string, number> = {}
  let next = 0
  for (const item of [...items].sort((a, b) => a.top - b.top)) {
    const top = Math.max(item.top, next)
    placed[item.id] = top
    next = top + (heights[item.id] ?? fallbackHeight) + gap
  }
  return placed
}
