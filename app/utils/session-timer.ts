/** Ambient session timer state: counts up (elapsed) or down from `durationMs`. Times are epoch milliseconds. */
export interface SessionTimerState {
  /** Time counted before the current run (pauses keep it). */
  accumulatedMs: number
  /** When the current run started; `null` while paused or stopped. */
  startedAt: number | null
  /** Countdown length; `null` counts up. */
  durationMs: number | null
}

/** A timer that stops on its own after this long without writing. */
export const SESSION_IDLE_LIMIT_MS = 30 * 60_000

/** Countdown lengths offered in the timer menu (minutes); `null` = count up. */
export const TIMER_PRESETS: (number | null)[] = [null, 15, 25, 45, 60]

export const IDLE_TIMER: SessionTimerState = { accumulatedMs: 0, startedAt: null, durationMs: null }

export function timerElapsed(timer: SessionTimerState, now: number): number {
  return timer.accumulatedMs + (timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt))
}

/** What the clock shows: time left for a countdown (never below zero), elapsed time otherwise. */
export function timerShown(timer: SessionTimerState, now: number): number {
  const elapsed = timerElapsed(timer, now)
  return timer.durationMs === null ? elapsed : Math.max(0, timer.durationMs - elapsed)
}

export function isTimeUp(timer: SessionTimerState, now: number): boolean {
  return timer.durationMs !== null && timerElapsed(timer, now) >= timer.durationMs
}

export function startTimer(timer: SessionTimerState, now: number): SessionTimerState {
  return timer.startedAt === null ? { ...timer, startedAt: now } : timer
}

export function pauseTimer(timer: SessionTimerState, now: number): SessionTimerState {
  return timer.startedAt === null ? timer : { ...timer, accumulatedMs: timerElapsed(timer, now), startedAt: null }
}

/** True when nothing was written for longer than the idle limit. */
export function isIdle(lastActivity: number, now: number, limit = SESSION_IDLE_LIMIT_MS): boolean {
  return now - lastActivity > limit
}

/** `m:ss`, or `h:mm:ss` from one hour. Rounds up so a countdown shows 0:00 only when it is over. */
export function formatClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** Spoken form for screen readers, e.g. "12 minutes 5 seconds". */
export function describeClock(ms: number): string {
  const total = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return [minutes && `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`, `${seconds} ${seconds === 1 ? 'second' : 'seconds'}`].filter(Boolean).join(' ')
}
