import { describe, expect, it } from 'vitest'
import type { StructureNode } from '#shared/schemas/manuscript'
import { useTreeDragDrop } from './useTreeDragDrop'

const scene = (id: string): StructureNode => ({ id, type: 'scene', title: id, path: `${id}.md`, wordCount: 0, children: [] })
const chapter = (id: string, children: StructureNode[]): StructureNode => ({ id, type: 'chapter', title: id, path: `${id}/index.md`, wordCount: 0, children })
const tree = [{ id: 'p1', type: 'part', title: 'p1', path: 'p1/index.md', wordCount: 0, children: [chapter('c1', [scene('s1'), scene('s2'), scene('s3')]), chapter('c2', [])] }] as StructureNode[]

describe('useTreeDragDrop.resolveTarget', () => {
  const { resolveTarget } = useTreeDragDrop(tree, () => {})

  it('drops a scene after a later sibling (index adjusted for removal)', () => {
    expect(resolveTarget('s1', 's3', 'after')).toEqual({ parentId: 'c1', index: 2 })
    expect(resolveTarget('s3', 's1', 'before')).toEqual({ parentId: 'c1', index: 0 })
  })

  it('drops a scene inside another chapter at the end', () => {
    expect(resolveTarget('s2', 'c2', 'inside')).toEqual({ parentId: 'c2', index: 0 })
  })

  it('rejects invalid drops', () => {
    expect(resolveTarget('s1', 'p1', 'inside')).toBeNull()
    expect(resolveTarget('c1', 's1', 'before')).toBeNull()
    expect(resolveTarget('s1', 's1', 'after')).toBeNull()
  })
})
