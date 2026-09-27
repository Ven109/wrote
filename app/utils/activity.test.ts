import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '#shared/schemas/activity'
import { activityQueryFilter, changeLabel, mergeToolNames } from './activity'

describe('activity helpers', () => {
  it('turns the panel controls into an API filter', () => {
    const now = new Date('2026-09-27T12:00:00Z')
    expect(activityQueryFilter({ actor: 'all', tool: 'all', range: 'all' }, now)).toEqual({})
    expect(activityQueryFilter({ actor: 'mcp', tool: 'create_note', range: 'day' }, now)).toEqual({ actor: 'mcp', tool: 'create_note', since: '2026-09-26T12:00:00.000Z' })
  })

  it('labels file changes', () => {
    expect(changeLabel({ path: 'a.md', before: null, after: 'x' })).toBe('created a.md')
    expect(changeLabel({ path: 'a.md', before: 'x', after: null })).toBe('removed a.md')
    expect(changeLabel({ path: 'a.md', before: 'x', after: 'y' })).toBe('changed a.md')
  })

  it('keeps known tool names sorted and unique', () => {
    expect(mergeToolNames(['undo'], [{ tool: 'create_note' }, { tool: 'undo' }] as ActivityEntry[])).toEqual(['create_note', 'undo'])
  })
})
