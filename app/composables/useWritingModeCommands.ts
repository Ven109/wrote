import type { CommandPaletteItem, DropdownMenuItem } from '@nuxt/ui'

/** Keyboard shortcuts of the writing modes (`meta` is ⌘ on macOS, Ctrl elsewhere). */
export const WRITING_MODE_KBDS = {
  distractionFree: ['meta', 'shift', 'f'],
  focus: ['meta', 'shift', 'o'],
  typewriter: ['meta', 'shift', 'y'],
} as const

interface WritingModeActions {
  toggleDistractionFree: () => unknown
  toggleTimer: () => unknown
}

/**
 * Writing-mode toggles as data: ⌘K palette entries, the page's "Writing modes" menu and the keyboard shortcuts
 * all come from the same list, so every mode is reachable by palette, shortcut and tap.
 */
export function useWritingModeCommands(actions: WritingModeActions, timerRunning: Readonly<Ref<boolean>>) {
  const modes = useWritingModes()
  const { registerGroup, open } = useCommandPalette()
  const onOff = (on: boolean) => (on ? 'On' : 'Off')

  const toggles = computed(() => [
    { id: 'distraction-free', label: 'Distraction-free mode', icon: 'i-lucide-maximize', on: modes.distractionFree.value, kbds: [...WRITING_MODE_KBDS.distractionFree], run: actions.toggleDistractionFree },
    { id: 'focus', label: 'Focus mode', icon: 'i-lucide-scan-text', on: modes.focus.value, kbds: [...WRITING_MODE_KBDS.focus], run: modes.toggleFocus },
    { id: 'focus-sentence', label: 'Focus on the sentence', icon: 'i-lucide-text-cursor', on: modes.focusScope.value === 'sentence', kbds: undefined, run: modes.toggleFocusScope },
    { id: 'typewriter', label: 'Typewriter scrolling', icon: 'i-lucide-keyboard', on: modes.typewriter.value, kbds: [...WRITING_MODE_KBDS.typewriter], run: modes.toggleTypewriter },
    { id: 'timer', label: 'Session timer', icon: 'i-lucide-timer', on: modes.timerVisible.value, kbds: undefined, run: () => modes.setTimerVisible(!modes.timerVisible.value) },
  ])

  registerGroup('writing-modes', () => ({
    id: 'writing-modes',
    label: 'Writing modes',
    items: [
      ...toggles.value.map((toggle): CommandPaletteItem => ({
        label: toggle.label,
        icon: toggle.icon,
        suffix: onOff(toggle.on),
        kbds: toggle.kbds,
        onSelect: () => {
          open.value = false
          void toggle.run()
        },
      })),
      { label: timerRunning.value ? 'Pause session timer' : 'Start session timer', icon: timerRunning.value ? 'i-lucide-pause' : 'i-lucide-play', onSelect: () => {
        open.value = false
        void actions.toggleTimer()
      } },
    ],
  }))

  defineShortcuts(Object.fromEntries(toggles.value.filter(toggle => toggle.kbds).map(toggle => [
    toggle.kbds!.join('_'),
    { usingInput: true, handler: () => void toggles.value.find(t => t.id === toggle.id)?.run() },
  ])))

  /** The same toggles as checkbox items for the page's "Writing modes" menu (touch devices have no shortcuts). */
  const menu = computed<DropdownMenuItem[]>(() => toggles.value.map(toggle => ({
    label: toggle.label,
    icon: toggle.icon,
    type: 'checkbox' as const,
    checked: toggle.on,
    kbds: toggle.kbds,
    onUpdateChecked: () => void toggle.run(),
  })))

  return { menu }
}
