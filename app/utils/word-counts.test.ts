import { describe, expect, it } from 'vitest'
import type { StructureNode } from '#shared/schemas/manuscript'
import { liveWordCounts } from './word-counts'

const node = (id: string, type: StructureNode['type'], wordCount: number, children: StructureNode[] = []): StructureNode =>
  ({ id, type, title: id, path: `${id}.md`, wordCount, children })

const tree = [
  node('p1', 'part', 30, [node('c1', 'chapter', 30, [node('s1', 'scene', 10), node('s2', 'scene', 20)])]),
  node('p2', 'part', 5, [node('c2', 'chapter', 5, [node('s3', 'scene', 5)])]),
]

describe('liveWordCounts', () => {
  it('adds the unsaved delta to chapter and book', () => {
    expect(liveWordCounts(tree, 's1', 14)).toEqual({ scene: 14, chapter: 34, book: 39 })
  })

  it('falls back to saved totals for unknown entries', () => {
    expect(liveWordCounts(tree, 'note', 7)).toEqual({ scene: 7, chapter: null, book: 35 })
    expect(liveWordCounts([], undefined, 0)).toEqual({ scene: 0, chapter: null, book: 0 })
  })
})
