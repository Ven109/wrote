import type { WatchSource } from 'vue'
import { WRITING_MODES_CONTEXT, type WritingModesContext } from '~/editor/writing-modes-context'

/** True for the write page of any book – switching scenes keeps the writing session (modes, timer) going. */
export function isWriteRoute(path: string): boolean {
  return /^\/books\/[^/]+\/write(?:\/|$)/.test(path)
}

/**
 * Writing modes for the write page: distraction-free, focus and typewriter modes, the session timer, their ⌘K
 * commands and shortcuts, and the editor context. `activity` (the draft) keeps the timer from idling out.
 * Leaving the write page ends the session: distraction-free mode exits and the timer stops.
 */
export function useWritingEnvironment(activity: WatchSource<unknown>) {
  const modes = useWritingModes()
  const distractionFree = useDistractionFree()
  const timer = useSessionTimer(activity)
  const router = useRouter()

  const { menu } = useWritingModeCommands({
    toggleDistractionFree: distractionFree.toggle,
    toggleTimer: () => {
      modes.setTimerVisible(true)
      timer.toggle()
    },
  }, timer.running)

  const context: WritingModesContext = {
    focus: modes.focus,
    focusScope: modes.focusScope,
    typewriter: modes.typewriter,
    distractionFree: modes.distractionFree,
  }
  provide(WRITING_MODES_CONTEXT, context)

  onScopeDispose(() => {
    if (isWriteRoute(router.currentRoute.value.path)) return
    void distractionFree.exit()
    timer.stop()
  })

  return {
    ...modes,
    menu,
    exitDistractionFree: distractionFree.exit,
    timer,
    /** Props and listeners for `<EditorSessionTimer v-bind v-on>`. */
    timerProps: computed(() => ({ label: timer.label.value, spoken: timer.spoken.value, running: timer.running.value, durationMinutes: timer.durationMinutes.value })),
    timerEvents: {
      toggle: timer.toggle,
      reset: timer.stop,
      duration: timer.setDuration,
      hide: () => modes.setTimerVisible(false),
    },
  }
}
