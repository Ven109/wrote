import { useCaptureStore } from '~/stores/capture'
import { useExportStore } from '~/stores/export'

/** Registers the app-wide commands (navigation, layout, color mode) in the command palette. */
export function useAppCommands() {
  const { registerGroup, open } = useCommandPalette()
  const { toggleSidebar, toggleAssistant } = useAppLayout()
  const colorMode = useColorMode()
  const capture = useCaptureStore()
  const exporter = useExportStore()
  const { bookId } = useAppNavigation()

  function run(action: () => void) {
    return () => {
      action()
      open.value = false
    }
  }

  registerGroup('app', () => ({
    id: 'app',
    label: 'General',
    items: [
      { label: 'Library', icon: 'i-lucide-library-big', to: '/', onSelect: run(() => {}) },
      { label: 'Quick capture', icon: 'i-lucide-inbox', kbds: ['meta', 'shift', 'n'], onSelect: run(() => {
        capture.open = true
      }) },
      ...(bookId.value
        ? [{ label: 'Export book…', icon: 'i-lucide-download', onSelect: run(() => {
            exporter.open = true
          }) }]
        : []),
      { label: 'Toggle sidebar', icon: 'i-lucide-panel-left', kbds: ['meta', 'b'], onSelect: run(toggleSidebar) },
      { label: 'Toggle assistant', icon: 'i-lucide-sparkles', kbds: ['meta', 'j'], onSelect: run(toggleAssistant) },
      {
        label: 'Toggle dark mode',
        icon: 'i-lucide-sun-moon',
        onSelect: run(() => {
          colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
        }),
      },
    ],
  }))
}
