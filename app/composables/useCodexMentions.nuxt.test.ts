import { describe, expect, it } from 'vitest'
import { mentionMenuItems } from './useCodexMentions'

describe('mentionMenuItems', () => {
  it('lists codex entries with aliases as description and inserts wiki links', () => {
    const items = mentionMenuItems([
      { id: 'cdx_1', path: 'codex/characters/mara.md', title: 'Mara Velden', codexType: 'character', names: ['Mara Velden', 'The Cartographer'], excerpt: '', facts: [] },
    ], type => `icon-${type}`)
    expect(items).toEqual([[
      { type: 'label', label: 'Codex' },
      { kind: 'wikiLink', target: 'Mara Velden', label: 'Mara Velden', description: 'The Cartographer', icon: 'icon-character' },
    ]])
    expect(mentionMenuItems([], () => '')).toEqual([])
  })
})
