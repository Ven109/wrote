import { describe, expect, it } from 'vitest'
import type { StructureNode } from '#shared/schemas/manuscript'
import { aiShares, formatShare } from './provenance'

const scene: StructureNode = { id: 'scn_1', type: 'scene', title: 'S', path: 'p/c/s.md', wordCount: 100, children: [] }
const tree: StructureNode[] = [{ id: 'prt_1', type: 'part', title: 'P', path: 'p/index.md', wordCount: 100, children: [{ id: 'chp_1', type: 'chapter', title: 'C', path: 'p/c/index.md', wordCount: 100, children: [scene] }] }]
const stat = (aiWords: number, totalWords: number) => ({ aiWords, totalWords, share: aiWords / totalWords })

describe('aiShares', () => {
  it('reports scene, chapter and book shares', () => {
    const stats = { book: stat(10, 200), entries: { scn_1: stat(10, 100), chp_1: stat(10, 100) } }
    expect(aiShares(stats, tree, 'scn_1')).toEqual({ scene: 0.1, chapter: 0.1, book: 0.05 })
    expect(aiShares(stats, tree, undefined)).toEqual({ scene: 0, chapter: null, book: 0.05 })
  })

  it('is null when nothing is AI-assisted', () => {
    expect(aiShares({ book: stat(0, 200), entries: {} }, tree, 'scn_1')).toBeNull()
    expect(aiShares(undefined, tree, 'scn_1')).toBeNull()
  })

  it('formats shares as whole percent', () => {
    expect(formatShare(0.126)).toBe('13 %')
  })
})
