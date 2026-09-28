import { describe, expect, it } from 'vitest'
import type { TimelineItem, TimelineView } from '#shared/schemas/timeline'
import { draggedKey, formatAxisDay, moveItem, itemBox, MIN_ITEM_WIDTH, timelineLanes, timelineRange, timelineTicks } from './timeline-layout'

const item = (id: string, key: number, patch: Partial<TimelineItem> = {}): TimelineItem => ({
  id, kind: 'scene', title: id, path: `${id}.md`, date: `Day ${key}`, key, endKey: null, group: 'The Harbor', pov: null, location: null, characters: [], places: [], ...patch,
})
const view = (items: TimelineItem[]): TimelineView => ({ items, undated: [], people: [{ id: 'mara', title: 'Mara' }, { id: 'jonah', title: 'Jonah' }], locations: [], axis: null, config: { calendars: [] } })

describe('timelineLanes', () => {
  it('groups by chapter with events in their own lane', () => {
    const lanes = timelineLanes(view([item('a', 1), item('b', 2, { group: 'The Map' }), item('e', 3, { kind: 'event', group: 'Event' })]), 'chapter')
    expect(lanes.map(lane => [lane.label, lane.items.map(i => i.id)])).toEqual([['The Harbor', ['a']], ['The Map', ['b']], ['Events', ['e']]])
  })

  it('groups by character, repeating shared items and collecting items without characters', () => {
    const lanes = timelineLanes(view([item('a', 1, { characters: ['mara', 'jonah'] }), item('b', 2, { characters: ['mara'] }), item('c', 3)]), 'character')
    expect(lanes.map(lane => [lane.label, lane.items.map(i => i.id)])).toEqual([['Mara', ['a', 'b']], ['Jonah', ['a']], ['No characters', ['c']]])
  })
})

describe('axis', () => {
  it('pads the range by a day and spaces ticks by zoom', () => {
    const range = timelineRange([item('a', 1.5), item('b', 3, { endKey: 5.2 })])
    expect(range).toEqual({ start: 0, end: 7 })
    expect(timelineTicks(range, 80).map(t => t.day)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(timelineTicks(range, 12).map(t => t.day)).toEqual([0, 6])
    expect(timelineRange([])).toEqual({ start: 0, end: 1 })
  })

  it('places items proportionally with a minimum width', () => {
    expect(itemBox(item('a', 3), 1, 32)).toEqual({ left: 64, width: MIN_ITEM_WIDTH })
    expect(itemBox(item('a', 3, { endKey: 6 }), 1, 32)).toEqual({ left: 64, width: 96 })
  })

  it('snaps drags to days, or quarter days when zoomed in', () => {
    expect(draggedKey(2, 70, 32)).toBe(4)
    expect(draggedKey(2, -10, 32)).toBe(2)
    expect(draggedKey(2, 45, 80)).toBe(2.5)
  })
})

describe('moveItem', () => {
  it('moves an item and its end, keeping the order', () => {
    const moved = moveItem(view([item('a', 1), item('b', 2, { endKey: 3 })]), 'b', 0.5)
    expect(moved.items.map(i => [i.id, i.key, i.endKey])).toEqual([['b', 0.5, 1.5], ['a', 1, null]])
  })
})

describe('formatAxisDay', () => {
  it('writes axis labels like the book\'s dates', () => {
    expect(formatAxisDay({ axis: { key: 1, kind: 'relative', hasTime: false }, config: { calendars: [] } }, 3)).toBe('Day 4')
    expect(formatAxisDay({ axis: null, config: { calendars: [] } }, 4)).toBe('4')
  })
})
