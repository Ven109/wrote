import { describe, expect, it } from 'vitest'
import type { StructureNode } from '../schemas/manuscript'
import { canContain, findNodeByPath, locateNode, moveInTree, neighbourMove, pathToNode } from './manuscript-tree'

const scene = (id: string, words = 10): StructureNode => ({ id, type: 'scene', title: id, path: `${id}.md`, wordCount: words, status: 'draft', children: [] })
const node = (id: string, type: 'part' | 'chapter', children: StructureNode[]): StructureNode => ({ id, type, title: id, path: `${id}/index.md`, wordCount: 0, children })

const tree = () => [
  node('p1', 'part', [node('c1', 'chapter', [scene('s1'), scene('s2')]), node('c2', 'chapter', [scene('s3', 5)])]),
  node('p2', 'part', []),
]

describe('manuscript tree helpers', () => {
  it('locates nodes with parent and index', () => {
    const found = locateNode(tree(), 's2')!
    expect(found.parent?.id).toBe('c1')
    expect(found.index).toBe(1)
    expect(locateNode(tree(), 'nope')).toBeNull()
  })

  it('builds breadcrumb paths and finds by file path', () => {
    expect(pathToNode(tree(), 's3').map(n => n.id)).toEqual(['p1', 'c2', 's3'])
    expect(findNodeByPath(tree(), 's2.md')?.id).toBe('s2')
  })

  it('knows which types can contain which', () => {
    const [p1] = tree()
    expect(canContain(null, p1!)).toBe(true)
    expect(canContain(p1!, scene('x'))).toBe(false)
    expect(canContain(p1!.children[0]!, scene('x'))).toBe(true)
  })

  it('moves scenes within and across chapters and recomputes word counts', () => {
    const moved = moveInTree(tree(), 's1', 'c2', 0)!
    expect(moved[0]!.children.map(c => c.children.map(s => s.id))).toEqual([['s2'], ['s1', 's3']])
    expect(moved[0]!.children[1]!.wordCount).toBe(15)
    expect(moveInTree(tree(), 's2', 'c1', 0)![0]!.children[0]!.children.map(s => s.id)).toEqual(['s2', 's1'])
  })

  it('rejects invalid moves and leaves the input untouched', () => {
    const original = tree()
    expect(moveInTree(original, 's1', 'p1', 0)).toBeNull()
    expect(moveInTree(original, 'c1', null, 0)).toBeNull()
    expect(original[0]!.children[0]!.children).toHaveLength(2)
  })

  it('computes neighbour moves', () => {
    expect(neighbourMove(tree(), 's1', 1)).toEqual({ parentId: 'c1', index: 1 })
    expect(neighbourMove(tree(), 's1', -1)).toBeNull()
    expect(neighbourMove(tree(), 'p2', -1)).toEqual({ parentId: null, index: 0 })
  })
})
