import { describe, expect, it } from 'vitest'
import { describeClock, formatClock, IDLE_TIMER, isIdle, isTimeUp, pauseTimer, startTimer, timerElapsed, timerShown } from './session-timer'

describe('session timer', () => {
  it('counts up while running and keeps the time across a pause', () => {
    const running = startTimer(IDLE_TIMER, 1_000)
    expect(timerElapsed(running, 61_000)).toBe(60_000)
    const paused = pauseTimer(running, 61_000)
    expect(timerElapsed(paused, 500_000)).toBe(60_000)
    expect(timerElapsed(startTimer(paused, 600_000), 610_000)).toBe(70_000)
  })

  it('ignores start while running and pause while paused', () => {
    const running = startTimer(IDLE_TIMER, 1_000)
    expect(startTimer(running, 5_000)).toBe(running)
    expect(pauseTimer(IDLE_TIMER, 5_000)).toBe(IDLE_TIMER)
  })

  it('counts down from the duration and reports when time is up', () => {
    const countdown = startTimer({ ...IDLE_TIMER, durationMs: 60_000 }, 0)
    expect(timerShown(countdown, 20_000)).toBe(40_000)
    expect(isTimeUp(countdown, 59_999)).toBe(false)
    expect(isTimeUp(countdown, 60_000)).toBe(true)
    expect(timerShown(countdown, 90_000)).toBe(0)
  })

  it('treats more than the idle limit without writing as idle', () => {
    expect(isIdle(0, 30 * 60_000)).toBe(false)
    expect(isIdle(0, 30 * 60_000 + 1)).toBe(true)
  })

  it.each([
    [0, '0:00', '0 seconds'],
    [61_000, '1:01', '1 minute 1 second'],
    [59_001, '1:00', '1 minute 0 seconds'],
    [3_723_000, '1:02:03', '62 minutes 3 seconds'],
  ])('formats %i ms as %s', (ms, clock, spoken) => {
    expect(formatClock(ms)).toBe(clock)
    expect(describeClock(ms)).toBe(spoken)
  })
})
