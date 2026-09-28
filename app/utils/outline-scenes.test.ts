import { describe, expect, it } from 'vitest'
import type { StructureNode } from '#shared/schemas/manuscript'
import { chapterOptions, sceneOptions, suggestedChapter } from './outline-scenes'

const node = (id: string, type: StructureNode['type'], title: string, children: StructureNode[] = []): StructureNode => ({ id, type, title, path: id, wordCount: 0, children })
const tree = [node('prt_1', 'part', 'One', [
  node('chp_1', 'chapter', 'Harbor', [node('scn_1', 'scene', 'Arrival')]),
  node('chp_2', 'chapter', 'Guild', [node('scn_2', 'scene', 'Meeting')]),
])]

describe('outline scene options', () => {
  it('labels scenes with their chapter and chapters with their part', () => {
    expect(sceneOptions(tree)).toEqual([{ label: 'Harbor › Arrival', value: 'scn_1' }, { label: 'Guild › Meeting', value: 'scn_2' }])
    expect(chapterOptions(tree).map(o => o.label)).toEqual(['One › Harbor', 'One › Guild'])
  })

  it('suggests the chapter of the last linked scene, else the last chapter', () => {
    expect(suggestedChapter(tree, ['scn_1'])).toBe('chp_1')
    expect(suggestedChapter(tree, [])).toBe('chp_2')
    expect(suggestedChapter([], [])).toBeUndefined()
  })
})
