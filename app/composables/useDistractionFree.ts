import { useEventListener, useFullscreen } from '@vueuse/core'

/** Popups that Esc should close first: dialogs, menus, the editor's suggestion menus and inline AI completions. */
const ESCAPE_OWNERS = '[role="dialog"], [role="menu"], [role="listbox"], .ProseMirror .ghost-text'

/**
 * Esc leaves distraction-free mode unless it belongs to something else: typing in an IME, or a dialog, menu,
 * suggestion list or ghost completion that is open in `root`.
 */
export function exitsOnEscape(event: Pick<KeyboardEvent, 'key' | 'isComposing'>, root: Pick<ParentNode, 'querySelector'>): boolean {
  return event.key === 'Escape' && !event.isComposing && !root.querySelector(ESCAPE_OWNERS)
}

/**
 * Distraction-free mode: the layout hides sidebars, header, toolbars and panels and the page goes full screen
 * (where the browser allows it). Esc – or leaving full screen – exits; the layout state was never touched, so the
 * previous layout comes back as it was.
 */
export function useDistractionFree() {
  const { distractionFree } = useWritingModes()
  const fullscreen = useFullscreen()

  async function enter() {
    if (distractionFree.value) return
    distractionFree.value = true
    if (fullscreen.isSupported.value && !fullscreen.isFullscreen.value) await fullscreen.enter().catch(() => {})
  }

  async function exit() {
    if (!distractionFree.value) return
    distractionFree.value = false
    if (fullscreen.isFullscreen.value) await fullscreen.exit().catch(() => {})
  }

  const toggle = () => (distractionFree.value ? exit() : enter())

  // In full screen the browser takes Esc itself and only reports that full screen ended.
  watch(fullscreen.isFullscreen, (now, before) => {
    if (before && !now) void exit()
  })
  // Capture phase, consumed: the editor would otherwise take Esc too (select the parent block).
  useEventListener('keydown', (event: KeyboardEvent) => {
    if (!distractionFree.value || !exitsOnEscape(event, document)) return
    event.preventDefault()
    event.stopPropagation()
    void exit()
  }, { capture: true })

  return { distractionFree, enter, exit, toggle }
}
