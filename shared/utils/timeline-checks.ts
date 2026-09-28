import type { TimelineItem } from '../schemas/timeline'

export interface TimelineOverlap {
  character: string
  day: number
  items: string[]
  places: string[]
}

export interface TimelineGap {
  after: string
  before: string
  days: number
}

const span = (item: TimelineItem) => ({ start: Math.floor(item.key), end: Math.floor(item.endKey ?? item.key) })

/**
 * A character in two different places at the same time: two items on the same day (or overlapping events)
 * that involve the character, each at exactly one place, and the places differ.
 */
export function findOverlaps(items: TimelineItem[]): TimelineOverlap[] {
  const located = items.filter(item => item.places.length === 1)
  const found = new Map<string, TimelineOverlap>()
  for (let i = 0; i < located.length; i++) {
    for (let j = i + 1; j < located.length; j++) {
      const [a, b] = [located[i]!, located[j]!]
      const [sa, sb] = [span(a), span(b)]
      if (sa.start > sb.end || sb.start > sa.end || a.places[0] === b.places[0]) continue
      for (const character of a.characters.filter(id => b.characters.includes(id))) {
        const day = Math.max(sa.start, sb.start)
        const key = `${character}:${day}`
        const overlap = found.get(key) ?? { character, day, items: [], places: [] }
        for (const item of [a, b]) {
          if (!overlap.items.includes(item.id)) overlap.items.push(item.id)
          if (!overlap.places.includes(item.places[0]!)) overlap.places.push(item.places[0]!)
        }
        found.set(key, overlap)
      }
    }
  }
  return [...found.values()]
}

/**
 * Long unexplained gaps between consecutive items: more than `factor` times the typical (median) spacing,
 * and at least `minDays`. Relative to the book's own pace, so a story told in hours flags a week.
 */
export function findGaps(items: TimelineItem[], options: { factor?: number, minDays?: number } = {}): TimelineGap[] {
  const { factor = 4, minDays = 2 } = options
  const sorted = [...items].sort((a, b) => a.key - b.key)
  const spacing = sorted.slice(1).map((item, index) => item.key - (sorted[index]!.endKey ?? sorted[index]!.key)).filter(days => days > 0)
  if (spacing.length < 2) return []
  const median = [...spacing].sort((a, b) => a - b)[Math.floor(spacing.length / 2)]!
  const threshold = Math.max(minDays, median * factor)
  return sorted.slice(1).flatMap((item, index) => {
    const previous = sorted[index]!
    const days = item.key - (previous.endKey ?? previous.key)
    return days > threshold ? [{ after: previous.id, before: item.id, days: Math.round(days * 10) / 10 }] : []
  })
}
