import { describe, expect, it } from 'vitest'
import { triageChips } from './triage-chips'

const suggestions = {
  tags: ['plot', 'sea'],
  links: [{ id: 'cdx_1', title: 'Mara Velden', type: 'codex' as const, reason: 'mentioned' as const }, { id: 'cdx_2', title: 'Hollow Bay', type: 'codex' as const, reason: 'related' as const }],
  chapter: { id: 'chp_1', title: 'The Harbor', path: 'x' },
}

describe('triageChips', () => {
  it('offers tags, links and the chapter, minus what the note has and what was dismissed', () => {
    const chips = triageChips(suggestions, { tags: ['Plot'], draft: 'Idea. [[Hollow Bay]]' }, new Set(['chapter:chp_1']))
    expect(chips.map(chip => chip.key)).toEqual(['tag:sea', 'link:cdx_1'])
  })

  it('is empty without suggestions', () => {
    expect(triageChips(undefined, { tags: [], draft: '' }, new Set())).toEqual([])
  })
})
