import type { TimelineItem, TimelineView } from '#shared/schemas/timeline'
import { formatInWorldDate } from '#shared/utils/in-world-date'

export type LaneMode = 'chapter' | 'character'

export interface TimelineLane {
  id: string
  label: string
  items: TimelineItem[]
}

export interface TimelineTick {
  day: number
  x: number
}

/** Pixels per day for each zoom step (hours → months). */
export const ZOOM_LEVELS = [4, 12, 32, 80, 200] as const
export const DEFAULT_ZOOM = 2
/** Item bars are at least this wide (touch target); events that last are as wide as their span. */
export const MIN_ITEM_WIDTH = 44

/** Swimlanes: one per chapter (events in their own lane) or one per character (an item appears in each character's lane). */
export function timelineLanes(view: TimelineView, mode: LaneMode): TimelineLane[] {
  if (mode === 'chapter') {
    const lanes = new Map<string, TimelineLane>()
    for (const item of view.items) {
      const id = item.kind === 'event' ? '__events' : item.group
      const lane = lanes.get(id) ?? { id, label: item.kind === 'event' ? 'Events' : item.group || 'No chapter', items: [] }
      lane.items.push(item)
      lanes.set(id, lane)
    }
    return [...lanes.values()]
  }
  const lanes = view.people
    .map(person => ({ id: person.id, label: person.title, items: view.items.filter(item => item.characters.includes(person.id)) }))
    .filter(lane => lane.items.length)
  const unassigned = view.items.filter(item => !item.characters.length)
  return unassigned.length ? [...lanes, { id: '__none', label: 'No characters', items: unassigned }] : lanes
}

/** The day range shown (whole days, one day of padding on each side). */
export function timelineRange(items: TimelineItem[]): { start: number, end: number } {
  if (!items.length) return { start: 0, end: 1 }
  const start = Math.floor(Math.min(...items.map(item => item.key))) - 1
  const end = Math.ceil(Math.max(...items.map(item => item.endKey ?? item.key))) + 1
  return { start, end: Math.max(end, start + 1) }
}

/** Axis ticks: every day when zoomed in, every n days otherwise, so labels stay ≥ ~64px apart. */
export function timelineTicks(range: { start: number, end: number }, perDay: number): TimelineTick[] {
  const step = Math.max(1, Math.ceil(64 / perDay))
  const ticks: TimelineTick[] = []
  for (let day = range.start; day <= range.end; day += step) ticks.push({ day, x: (day - range.start) * perDay })
  return ticks
}

export function itemBox(item: TimelineItem, rangeStart: number, perDay: number): { left: number, width: number } {
  const span = (item.endKey ?? item.key) - item.key
  return { left: (item.key - rangeStart) * perDay, width: Math.max(MIN_ITEM_WIDTH, span * perDay) }
}

/** A drag of `dx` pixels as a new key: whole days, or quarter days when zoomed in far enough. */
export function draggedKey(key: number, dx: number, perDay: number): number {
  const snap = perDay >= 80 ? 0.25 : 1
  const delta = Math.round(dx / perDay / snap) * snap
  return key + delta
}

/** The view with one item moved (optimistic update); an event's end moves along, items stay sorted. */
export function moveItem(view: TimelineView, id: string, key: number): TimelineView {
  const items = view.items
    .map(item => (item.id === id ? { ...item, key, endKey: item.endKey === null ? null : item.endKey + key - item.key } : item))
    .sort((a, b) => a.key - b.key)
  return { ...view, items }
}

/** An axis label for a day, written like the book's dates ("Day 3", "1890-05-12", "3 Frostmonth 1203 AE"). */
export function formatAxisDay(view: Pick<TimelineView, 'axis' | 'config'>, day: number): string {
  return view.axis ? formatInWorldDate(day, view.axis, view.config) : String(day)
}
