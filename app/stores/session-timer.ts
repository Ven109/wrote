import { defineStore } from 'pinia'
import { IDLE_TIMER, type SessionTimerState } from '~/utils/session-timer'

/** The ambient writing-session timer (shown in the page header and in distraction-free mode). */
export const useSessionTimerStore = defineStore('session-timer', () => {
  const timer = ref<SessionTimerState>({ ...IDLE_TIMER })
  /** Last time the author wrote something; drives the idle stop. */
  const lastActivity = ref(0)

  return { timer, lastActivity }
})
