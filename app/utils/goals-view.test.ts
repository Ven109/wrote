import { describe, expect, it } from 'vitest'
import { chartGeometry, heatmapWeeks, percent } from './goals-view'

const day = (d: string, added: number) => ({ day: d, added, deleted: 0, net: added, minutes: 0 })

describe('heatmapWeeks', () => {
  it('lays out weeks Monday-first ending with the current week, with intensity levels', () => {
    // 2026-09-30 is a Wednesday.
    const weeks = heatmapWeeks([day('2026-09-28', 1000), day('2026-09-29', 250)], '2026-09-30', 2)
    expect(weeks).toHaveLength(2)
    expect(weeks[1]!.map(cell => cell.day)).toEqual(['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'])
    expect(weeks[1]!.map(cell => cell.level)).toEqual([4, 1, 0, 0, 0, 0, 0])
    expect(weeks[1]![3]!.future).toBe(true)
    expect(weeks[0]![0]!.day).toBe('2026-09-21')
  })
})

describe('chartGeometry', () => {
  it('scales words over time and draws the target line to the deadline', () => {
    const geometry = chartGeometry([{ day: '2026-09-01', words: 0 }, { day: '2026-09-11', words: 5000 }], { target: 10_000, deadline: '2026-09-21' }, 200, 100)
    expect(geometry.line).toBe('M0.0,100.0 L100.0,50.0')
    expect(geometry.targetLine).toBe('M0.0,100.0 L200.0,0.0')
    expect(geometry).toMatchObject({ maxWords: 10_000, firstDay: '2026-09-01', lastDay: '2026-09-21' })
    expect(chartGeometry([], { target: null, deadline: null }, 200, 100).line).toBe('')
  })

  it('computes capped percentages', () => {
    expect([percent(500, 1000), percent(1500, 1000), percent(-3, 1000), percent(10, null)]).toEqual([50, 100, 0, 0])
  })
})
