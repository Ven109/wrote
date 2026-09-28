import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionTimerStore } from '~/stores/session-timer'
import { IDLE_TIMER } from '~/utils/session-timer'
import { useSessionTimer } from './useSessionTimer'

let scope: ReturnType<typeof effectScope>
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T09:00:00Z'))
  useSessionTimerStore().timer = { ...IDLE_TIMER }
  scope = effectScope()
})
afterEach(() => {
  scope.stop()
  vi.useRealTimers()
})

describe('useSessionTimer', () => {
  it('counts up while running and holds still while paused', async () => {
    const timer = scope.run(() => useSessionTimer())!
    timer.start()
    await vi.advanceTimersByTimeAsync(65_000)
    expect(timer.label.value).toBe('1:05')
    timer.pause()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(timer.label.value).toBe('1:05')
    expect(timer.running.value).toBe(false)
  })

  it('counts down from a chosen length and pauses when time is up', async () => {
    const timer = scope.run(() => useSessionTimer())!
    timer.setDuration(15)
    expect(timer.label.value).toBe('15:00')
    timer.start()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(timer.label.value).toBe('14:00')
    await vi.advanceTimersByTimeAsync(14 * 60_000)
    expect(timer.running.value).toBe(false)
    expect(timer.label.value).toBe('0:00')
  })

  it('stops after 30 minutes without writing, but not while the author writes', async () => {
    const draft = ref('')
    const timer = scope.run(() => useSessionTimer(draft))!
    timer.start()
    await vi.advanceTimersByTimeAsync(20 * 60_000)
    draft.value = 'More words'
    await vi.advanceTimersByTimeAsync(20 * 60_000)
    expect(timer.running.value).toBe(true)
    await vi.advanceTimersByTimeAsync(11 * 60_000)
    expect(timer.running.value).toBe(false)
    expect(timer.label.value).toBe('0:00')
  })

  it('stop resets to zero and keeps the countdown length', () => {
    const timer = scope.run(() => useSessionTimer())!
    timer.setDuration(25)
    timer.toggle()
    timer.stop()
    expect(timer.running.value).toBe(false)
    expect(timer.durationMinutes.value).toBe(25)
    expect(timer.label.value).toBe('25:00')
  })
})
