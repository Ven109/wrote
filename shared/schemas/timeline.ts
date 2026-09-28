import { z } from 'zod'

/** A custom in-world calendar (fantasy/SF worlds): named months with their lengths, an optional era suffix. */
export const CalendarSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(100),
  months: z.array(z.object({ name: z.string().trim().min(1).max(40), days: z.number().int().min(1).max(400) })).min(1).max(40),
  /** Written after the year, e.g. `AE` in `12 Frostmonth 1203 AE`. */
  era: z.string().trim().max(20).optional(),
})
export type Calendar = z.infer<typeof CalendarSchema>

/** Timeline settings in `wrote.json`. `start` anchors "Day 1" to a date (any supported format). */
export const TimelineConfigSchema = z.object({
  start: z.string().max(100).optional(),
  calendars: z.array(CalendarSchema).max(10).default([]),
})
export type TimelineConfig = z.infer<typeof TimelineConfigSchema>

export type DateKind = 'iso' | 'relative' | 'calendar'

/** A parsed in-world date: a sortable key (days, fraction = time of day) and how it was written. */
export interface InWorldDate {
  key: number
  kind: DateKind
  /** The calendar a `calendar` date belongs to. */
  calendarId?: string
  /** Whether the text had a time of day (kept when the date is rewritten). */
  hasTime: boolean
}

/** A scene or event on the timeline. */
export interface TimelineItem {
  id: string
  kind: 'scene' | 'event'
  title: string
  path: string
  /** The date as written (`timeline` of a scene, `date` of an event). */
  date: string
  key: number
  /** End of an event that lasts (`end`), as a key. */
  endKey: number | null
  /** Chapter of a scene, codex type label of an event. */
  group: string
  pov: string | null
  location: string | null
  /** Codex characters and places in it (POV/location, event participants, mentions in the text). */
  characters: string[]
  places: string[]
}

export interface TimelineView {
  items: TimelineItem[]
  /** Scenes and events without a date (or one that could not be read). */
  undated: { id: string, kind: 'scene' | 'event', title: string, path: string, date: string | null }[]
  /** Codex characters and places that appear, for filters. */
  people: { id: string, title: string }[]
  locations: { id: string, title: string }[]
  /** How axis labels are written (the format of the first dated item, without time), and the settings to write them. */
  axis: InWorldDate | null
  config: TimelineConfig
}

export const TimelineQuerySchema = z.object({
  character: z.string().optional(),
  place: z.string().optional(),
  from: z.string().max(100).optional(),
  to: z.string().max(100).optional(),
})
export type TimelineQuery = z.infer<typeof TimelineQuerySchema>

/** Moving an item on the timeline: its new position as a key (days). */
export const MoveOnTimelineSchema = z.object({ key: z.number().finite() })
