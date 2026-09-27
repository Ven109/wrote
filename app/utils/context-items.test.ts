import { describe, expect, it } from 'vitest'
import type { ContextItem, ContextSnapshot } from '#shared/schemas/context'
import { contextGroups, omittedRows, sameOverrides, toggleId } from './context-items'

const item = (id: string, layer: ContextItem['layer']): ContextItem => ({ id, layer, kind: 'entry', title: id, source: null, text: 't', tokens: 1, pinned: false })
const snapshot: ContextSnapshot = {
  id: 'ctx_1', createdAt: '', feature: 'assistant', model: 'm', budget: 10, used: 3, system: '',
  items: [item('summary:book', 'summary'), item('entry:a', 'local'), item('style-guide', 'pinned')],
  omitted: [{ id: 'search:b', layer: 'retrieved', kind: 'search', title: 'B', source: null, tokens: 50, pinned: false, reason: 'budget' }],
}

describe('context items', () => {
  it('groups sent items by layer in prompt order with the author\'s choices', () => {
    const groups = contextGroups(snapshot, { pinned: ['entry:a'], removed: ['style-guide'] })
    expect(groups.map(group => [group.layer, group.label])).toEqual([['pinned', 'Always included'], ['local', 'What you are working on'], ['summary', 'Summaries']])
    expect(groups[0]!.rows[0]).toMatchObject({ removed: true, pinned: false, sent: true })
    expect(groups[1]!.rows[0]).toMatchObject({ pinned: true })
  })

  it('lists omitted items', () => {
    expect(omittedRows(snapshot, { pinned: ['search:b'], removed: [] })).toEqual([expect.objectContaining({ sent: false, pinned: true })])
  })

  it('toggles ids and compares overrides regardless of order', () => {
    expect(toggleId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleId(['a', 'b'], 'a')).toEqual(['b'])
    expect(sameOverrides({ pinned: ['a', 'b'], removed: [] }, { pinned: ['b', 'a'], removed: [] })).toBe(true)
    expect(sameOverrides({ pinned: ['a'], removed: [] }, { pinned: [], removed: ['a'] })).toBe(false)
  })
})
