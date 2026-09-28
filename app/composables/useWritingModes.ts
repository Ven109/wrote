import { storeToRefs } from 'pinia'
import type { FocusScope } from '#shared/schemas/writing-modes'
import { useWritingModesStore } from '~/stores/writing-modes'

/**
 * Writing-mode state and toggles: focus mode (paragraph/sentence), typewriter scrolling, session timer visibility
 * (all remembered) and the transient distraction-free flag. Shared by the layout, the write page and the editor.
 */
export function useWritingModes() {
  const store = useWritingModesStore()
  const { prefs, distractionFree } = storeToRefs(store)

  const focus = computed(() => prefs.value.focus)
  const focusScope = computed(() => prefs.value.focusScope)
  const typewriter = computed(() => prefs.value.typewriter)
  const timerVisible = computed(() => prefs.value.timer)

  return {
    distractionFree,
    focus,
    focusScope,
    typewriter,
    timerVisible,
    toggleFocus: () => store.setPref('focus', !focus.value),
    setFocusScope: (scope: FocusScope) => store.setPref('focusScope', scope),
    toggleFocusScope: () => store.setPref('focusScope', focusScope.value === 'paragraph' ? 'sentence' : 'paragraph'),
    toggleTypewriter: () => store.setPref('typewriter', !typewriter.value),
    setTimerVisible: (visible: boolean) => store.setPref('timer', visible),
  }
}
