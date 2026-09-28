import { describe, expect, it } from 'vitest'
import type { TimelineItem } from '../schemas/timeline'
import { findGaps, findOverlaps } from './timeline-checks'

const item = (id: string, key: number, extra: Partial<TimelineItem> = {}): TimelineItem =>
  ({ id, kind: 'scene', title: id, path: `${id}.md`, date: String(key), key, endKey: null, group: '', pov: null, location: null, characters: [], places: [], ...extra })

describe('findOverlaps', () => {
  it('flags a character in two places on the same day, not the same place or different days', () => {
    const items = [
      item('harbor', 3.3, { characters: ['mara', 'rook'], places: ['bay'] }),
      item('guild', 3.8, { characters: ['mara'], places: ['guild'] }),
      item('guild-later', 5, { characters: ['mara'], places: ['guild'] }),
      item('bay-again', 3.9, { characters: ['rook'], places: ['bay'] }),
    ]
    expect(findOverlaps(items)).toEqual([{ character: 'mara', day: 3, items: ['harbor', 'guild'], places: ['bay', 'guild'] }])
  })

  it('counts events that last', () => {
    const items = [item('siege', 10, { kind: 'event', endKey: 14, characters: ['mara'], places: ['city'] }), item('escape', 12, { characters: ['mara'], places: ['forest'] })]
    expect(findOverlaps(items)).toMatchObject([{ character: 'mara', day: 12, items: ['siege', 'escape'] }])
  })
})

describe('findGaps', () => {
  it('flags gaps much longer than the book\'s usual spacing', () => {
    const items = [item('a', 1), item('b', 2), item('c', 3), item('d', 4), item('e', 30), item('f', 31)]
    expect(findGaps(items)).toEqual([{ after: 'd', before: 'e', days: 26 }])
  })

  it('stays quiet for even pacing or too few items', () => {
    expect(findGaps([item('a', 1), item('b', 8), item('c', 15), item('d', 22)])).toEqual([])
    expect(findGaps([item('a', 1), item('b', 100)])).toEqual([])
  })
})
