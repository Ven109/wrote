import type { Calendar, InWorldDate, TimelineConfig } from '../schemas/timeline'

/** Times of day as fractions of a day, for "Day 3, evening" and the like. */
const TIMES_OF_DAY: Record<string, number> = { dawn: 0.2, morning: 0.3, noon: 0.5, midday: 0.5, afternoon: 0.6, dusk: 0.72, evening: 0.75, night: 0.9, midnight: 0.99 }

const ISO = /^(-?\d{1,6})(?:-(\d{2})(?:-(\d{2}))?)?(?:[T ](\d{2}):(\d{2}))?$/
const RELATIVE = /^day\s+(-?\d+)(?:\s*[,-]?\s*(.+))?$/i

/** Days from 0000-03-01 (proleptic Gregorian) – any fixed epoch works, it only needs to order. */
function gregorianDays(year: number, month: number, day: number): number {
  const y = month <= 2 ? year - 1 : year
  const era = Math.floor(y / 400)
  const yoe = y - era * 400
  const mp = (month + 9) % 12
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy
  return era * 146097 + doe
}

function gregorianFromDays(days: number): { year: number, month: number, day: number } {
  const era = Math.floor(days / 146097)
  const doe = days - era * 146097
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365)
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100))
  const mp = Math.floor((5 * doy + 2) / 153)
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1
  const month = mp < 10 ? mp + 3 : mp - 9
  return { year: yoe + era * 400 + (month <= 2 ? 1 : 0), month, day }
}

function timeFraction(text: string | undefined): { fraction: number, hasTime: boolean } {
  const value = text?.trim().toLowerCase()
  if (!value) return { fraction: 0, hasTime: false }
  const clock = /^(\d{1,2}):(\d{2})$/.exec(value)
  if (clock) return { fraction: (Number(clock[1]) * 60 + Number(clock[2])) / 1440, hasTime: true }
  return value in TIMES_OF_DAY ? { fraction: TIMES_OF_DAY[value]!, hasTime: true } : { fraction: 0, hasTime: false }
}

const daysPerYear = (calendar: Calendar) => calendar.months.reduce((sum, month) => sum + month.days, 0)

/** `12 Frostmonth 1203 AE`, `Frostmonth 12, 1203`, `Frostmonth 1203` or `1203 AE` in a custom calendar. */
function parseCalendarDate(text: string, calendar: Calendar): number | null {
  const era = calendar.era ? new RegExp(`\\s*${calendar.era.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') : null
  const hadEra = era ? era.test(text) : false
  const body = era ? text.replace(era, '').trim() : text.trim()
  const monthIndex = (name: string) => calendar.months.findIndex(month => month.name.toLowerCase() === name.toLowerCase())
  const forms: [RegExp, (match: RegExpExecArray) => [number, number, number] | null][] = [
    [/^(\d{1,2})\s+([^\d,]+?)\s+(-?\d+)$/, match => [Number(match[3]), monthIndex(match[2]!), Number(match[1])]],
    [/^([^\d,]+?)\s+(\d{1,2}),?\s+(-?\d+)$/, match => [Number(match[3]), monthIndex(match[1]!), Number(match[2])]],
    [/^([^\d,]+?)\s+(-?\d+)$/, match => [Number(match[2]), monthIndex(match[1]!), 1]],
    [/^(-?\d+)$/, match => (hadEra ? [Number(match[1]), 0, 1] : null)],
  ]
  for (const [pattern, read] of forms) {
    const match = pattern.exec(body)
    const parts = match ? read(match) : null
    if (!parts) continue
    const [year, month, day] = parts
    if (month < 0 || day < 1 || day > calendar.months[month]!.days) return null
    const before = calendar.months.slice(0, month).reduce((sum, item) => sum + item.days, 0)
    return year * daysPerYear(calendar) + before + day - 1
  }
  return null
}

/**
 * Reads an in-world date: ISO (`1890-05-12`, `1890-05`, `1890`, with `T14:30`), relative (`Day 3`,
 * `Day 3, evening`, `Day 3 14:30` – counted from `start` when set) or a custom calendar's form. `null` when
 * it cannot be read. Keys are days; they order dates of the same kind (and relative days once anchored).
 */
export function parseInWorldDate(text: string, config: Pick<TimelineConfig, 'start' | 'calendars'> = { calendars: [] }): InWorldDate | null {
  const value = text.trim()
  if (!value) return null
  const iso = ISO.exec(value)
  if (iso) {
    const [year, month, day] = [Number(iso[1]), Number(iso[2] ?? 1), Number(iso[3] ?? 1)]
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    const time = iso[4] ? (Number(iso[4]) * 60 + Number(iso[5])) / 1440 : 0
    return { key: gregorianDays(year, month, day) + time, kind: 'iso', hasTime: Boolean(iso[4]) }
  }
  const relative = RELATIVE.exec(value)
  if (relative) {
    const anchor = config.start && !RELATIVE.test(config.start.trim()) ? parseInWorldDate(config.start, { calendars: config.calendars }) : null
    const { fraction, hasTime } = timeFraction(relative[2])
    return { key: Math.floor(anchor?.key ?? 0) + Number(relative[1]) - 1 + fraction, kind: 'relative', hasTime }
  }
  for (const calendar of config.calendars) {
    const key = parseCalendarDate(value, calendar)
    if (key !== null) return { key, kind: 'calendar', calendarId: calendar.id, hasTime: false }
  }
  return null
}

/**
 * Writes a key back in the same form as `like` (dragging on the timeline keeps each date's format): ISO date
 * (with time if it had one), `Day N`, or the custom calendar's `D Month Year Era`.
 */
export function formatInWorldDate(key: number, like: InWorldDate, config: Pick<TimelineConfig, 'start' | 'calendars'> = { calendars: [] }): string {
  const days = Math.floor(key)
  const minutes = Math.round((key - days) * 1440)
  const clock = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  if (like.kind === 'iso') {
    const { year, month, day } = gregorianFromDays(days)
    const date = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return like.hasTime ? `${date}T${clock}` : date
  }
  if (like.kind === 'relative') {
    const anchor = config.start ? parseInWorldDate(config.start, { calendars: config.calendars }) : null
    const day = days - Math.floor(anchor && anchor.kind !== 'relative' ? anchor.key : 0) + 1
    return like.hasTime ? `Day ${day}, ${clock}` : `Day ${day}`
  }
  const calendar = config.calendars.find(candidate => candidate.id === like.calendarId)
  if (!calendar) return String(days)
  const perYear = daysPerYear(calendar)
  const year = Math.floor(days / perYear)
  let rest = days - year * perYear
  let month = 0
  while (rest >= calendar.months[month]!.days) rest -= calendar.months[month++]!.days
  return `${rest + 1} ${calendar.months[month]!.name} ${year}${calendar.era ? ` ${calendar.era}` : ''}`
}
