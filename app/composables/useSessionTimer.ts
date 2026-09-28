import { useIntervalFn } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import type { WatchSource } from 'vue'
import { useSessionTimerStore } from '~/stores/session-timer'
import { describeClock, formatClock, IDLE_TIMER, isIdle, isTimeUp, pauseTimer, startTimer, timerShown } from '~/utils/session-timer'

/**
 * The ambient session timer: counts up, or down from a chosen length. Start, pause, reset, pick a length. It pauses
 * when a countdown runs out and stops after 30 minutes without writing (`activity` changes count as writing).
 * Call once per page; the state lives in a store so it survives switching scenes.
 */
export function useSessionTimer(activity?: WatchSource<unknown>) {
  const { timer, lastActivity } = storeToRefs(useSessionTimerStore())
  const toast = useToast()
  const now = ref(Date.now())
  const running = computed(() => timer.value.startedAt !== null)

  function tick() {
    now.value = Date.now()
    if (isTimeUp(timer.value, now.value)) {
      pause()
      toast.add({ title: 'Session time is up', icon: 'i-lucide-alarm-clock' })
    }
    else if (isIdle(lastActivity.value, now.value)) stop()
  }

  const ticker = useIntervalFn(tick, 1000, { immediate: false })
  watch(running, value => (value ? ticker.resume() : ticker.pause()), { immediate: true })
  if (activity) watch(activity, () => (lastActivity.value = Date.now()))

  function start() {
    now.value = Date.now()
    lastActivity.value = now.value
    if (isTimeUp(timer.value, now.value)) timer.value = { ...IDLE_TIMER, durationMs: timer.value.durationMs }
    timer.value = startTimer(timer.value, now.value)
  }

  function pause() {
    now.value = Date.now()
    timer.value = pauseTimer(timer.value, now.value)
  }

  /** Back to zero (or the full countdown), stopped. */
  function stop() {
    timer.value = { ...IDLE_TIMER, durationMs: timer.value.durationMs }
  }

  /** Countdown length in minutes, or `null` to count up. Resets the timer. */
  function setDuration(minutes: number | null) {
    timer.value = { ...IDLE_TIMER, durationMs: minutes === null ? null : minutes * 60_000 }
  }

  const shown = computed(() => timerShown(timer.value, now.value))
  return {
    running,
    label: computed(() => formatClock(shown.value)),
    spoken: computed(() => describeClock(shown.value)),
    durationMinutes: computed(() => (timer.value.durationMs === null ? null : timer.value.durationMs / 60_000)),
    start,
    pause,
    toggle: () => (running.value ? pause() : start()),
    stop,
    setDuration,
  }
}
