import { describe, expect, it } from 'vitest'
import { addDays, dailyTarget, daysBetween, streaks, writingDays } from './goals'

const day = (d: string, added = 100) => ({ day: d, added, deleted: 0, net: added, minutes: 0 })

describe('goals', () => {
  it('computes the daily target from the words at the start of today', () => {
    expect(dailyTarget({ target: 50_000, deadline: '2026-11-30', wordsAtStartOfToday: 20_000, today: '2026-11-01' })).toEqual({ daysLeft: 30, dailyTarget: 1000 })
    expect(dailyTarget({ target: 1000, deadline: '2026-11-01', wordsAtStartOfToday: 1200, today: '2026-11-01' })).toEqual({ daysLeft: 1, dailyTarget: 0 })
    expect(dailyTarget({ target: 1000, deadline: '2026-10-01', wordsAtStartOfToday: 0, today: '2026-11-01' })).toEqual({ daysLeft: 0, dailyTarget: 1000 })
    expect(dailyTarget({ target: 1000, deadline: null, wordsAtStartOfToday: 0, today: '2026-11-01' })).toEqual({ daysLeft: null, dailyTarget: null })
  })

  it('counts streaks across days, months and years; today without writing keeps the streak', () => {
    const days = [day('2025-12-30'), day('2025-12-31'), day('2026-01-01'), day('2026-01-05'), day('2026-01-06'), day('2026-01-07', 0)]
    expect(streaks(days, '2026-01-07')).toEqual({ current: 2, longest: 3 })
    expect(streaks(days, '2026-01-08')).toEqual({ current: 0, longest: 3 })
    expect(streaks([], '2026-01-08')).toEqual({ current: 0, longest: 0 })
  })

  it('sums sessions per day', () => {
    const session = (d: string, start: string, end: string, added: number) => ({ id: start, day: d, startedAt: start, endedAt: end, added, deleted: 1, net: added - 1 })
    expect(writingDays([session('2026-01-01', '2026-01-01T08:00:00Z', '2026-01-01T08:30:00Z', 300), session('2026-01-01', '2026-01-01T20:00:00Z', '2026-01-01T20:10:00Z', 100)]))
      .toEqual([{ day: '2026-01-01', added: 400, deleted: 2, net: 398, minutes: 40 }])
  })

  it('does calendar arithmetic', () => {
    expect([addDays('2026-02-28', 1), addDays('2026-03-01', -1), daysBetween('2025-12-31', '2026-01-02')]).toEqual(['2026-03-01', '2026-02-28', 2])
  })
})
