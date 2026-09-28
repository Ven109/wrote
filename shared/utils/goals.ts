import type { WritingDay, WritingSession } from '../schemas/writing'

/** A local calendar day as YYYY-MM-DD. */
export const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number]
  return localDay(new Date(y, m - 1, d + days))
}

/** Whole days from `from` to `to` (both YYYY-MM-DD). */
export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((day) => {
    const [y, m, d] = day.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, m - 1, d)
  }) as [number, number]
  return Math.round((b - a) / 86_400_000)
}

/** Sessions summed per day (oldest first); minutes from session start to end. */
export function writingDays(sessions: WritingSession[]): WritingDay[] {
  const days = new Map<string, WritingDay>()
  for (const session of sessions) {
    const day = days.get(session.day) ?? { day: session.day, added: 0, deleted: 0, net: 0, minutes: 0 }
    day.added += session.added
    day.deleted += session.deleted
    day.net += session.net
    day.minutes += Math.round((Date.parse(session.endedAt) - Date.parse(session.startedAt)) / 60_000)
    days.set(session.day, day)
  }
  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Current and longest streak of days with words written. Today without writing yet does not break the current
 * streak (it counts up to yesterday until the day is over).
 */
export function streaks(days: WritingDay[], today: string): { current: number, longest: number } {
  const written = new Set(days.filter(day => day.added > 0).map(day => day.day))
  let longest = 0
  let run = 0
  let previous: string | null = null
  for (const day of [...written].sort()) {
    run = previous && daysBetween(previous, day) === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }
  let current = 0
  for (let day = written.has(today) ? today : addDays(today, -1); written.has(day); day = addDays(day, -1)) current++
  return { current, longest }
}

/**
 * The words needed per day to reach `target` by `deadline`, fixed for the day: from the words at the start of
 * today, over the days left including today. `null` without a target or deadline; 0 once the target is reached.
 */
export function dailyTarget(input: { target: number | null, deadline: string | null, wordsAtStartOfToday: number, today: string }): { daysLeft: number | null, dailyTarget: number | null } {
  if (!input.deadline) return { daysLeft: null, dailyTarget: null }
  const daysLeft = Math.max(0, daysBetween(input.today, input.deadline) + 1)
  if (!input.target) return { daysLeft, dailyTarget: null }
  const remaining = Math.max(0, input.target - input.wordsAtStartOfToday)
  return { daysLeft, dailyTarget: remaining === 0 ? 0 : Math.ceil(remaining / Math.max(1, daysLeft)) }
}
