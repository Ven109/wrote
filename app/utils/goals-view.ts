import type { WritingDay } from '#shared/schemas/writing'
import { addDays, daysBetween } from '#shared/utils/goals'

export interface HeatCell {
  day: string
  words: number
  /** 0 (none) … 4 (most); relative to the busiest day. */
  level: 0 | 1 | 2 | 3 | 4
  future: boolean
}

/**
 * The streak calendar: `weeks` columns of 7 days (Monday first) ending with the current week; intensity by
 * words added, in quarters of the busiest day.
 */
export function heatmapWeeks(days: WritingDay[], today: string, weeks = 53): HeatCell[][] {
  const words = new Map(days.map(day => [day.day, day.added]))
  const max = Math.max(1, ...days.map(day => day.added))
  const weekday = (new Date(`${today}T12:00:00`).getDay() + 6) % 7
  const start = addDays(today, -weekday - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, week) => Array.from({ length: 7 }, (_, d) => {
    const day = addDays(start, week * 7 + d)
    const count = words.get(day) ?? 0
    const level = count === 0 ? 0 : (Math.min(4, Math.ceil((count / max) * 4)) as HeatCell['level'])
    return { day, words: count, level, future: day > today }
  }))
}

export interface ChartGeometry {
  /** SVG path of words over time. */
  line: string
  /** Straight line from the first point to the target at the deadline (empty without both). */
  targetLine: string
  maxWords: number
  firstDay: string | null
  lastDay: string | null
}

/** Words-over-time chart in a `width` × `height` box, with the target line to the deadline. */
export function chartGeometry(history: { day: string, words: number }[], goal: { target: number | null, deadline: string | null }, width: number, height: number): ChartGeometry {
  if (!history.length) return { line: '', targetLine: '', maxWords: goal.target ?? 0, firstDay: null, lastDay: null }
  const first = history[0]!.day
  const last = goal.deadline && goal.deadline > history.at(-1)!.day ? goal.deadline : history.at(-1)!.day
  const span = Math.max(1, daysBetween(first, last))
  const maxWords = Math.max(goal.target ?? 0, ...history.map(point => point.words), 1)
  const x = (day: string) => ((daysBetween(first, day) / span) * width).toFixed(1)
  const y = (words: number) => (height - (words / maxWords) * height).toFixed(1)
  const line = history.map((point, index) => `${index ? 'L' : 'M'}${x(point.day)},${y(point.words)}`).join(' ')
  const targetLine = goal.target && goal.deadline ? `M${x(first)},${y(history[0]!.words)} L${x(goal.deadline)},${y(goal.target)}` : ''
  return { line, targetLine, maxWords, firstDay: first, lastDay: last }
}

/** Share (0–100) of a target reached, capped. */
export const percent = (value: number, target: number | null) => (target ? Math.min(100, Math.round((Math.max(0, value) / target) * 100)) : 0)
