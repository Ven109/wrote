import { useEventListener } from '@vueuse/core'

/** Pixels the on-screen keyboard covers at the bottom of the layout viewport (VisualViewport API). */
export function keyboardInset(innerHeight: number, viewport: { height: number, offsetTop: number }): number {
  return Math.max(0, Math.round(innerHeight - viewport.height - viewport.offsetTop))
}

/** Reactive keyboard inset so bottom toolbars can sit right above the keyboard. 0 on desktop/SSR. */
export function useKeyboardInset() {
  const inset = ref(0)
  if (import.meta.client && window.visualViewport) {
    const viewport = window.visualViewport
    const update = () => {
      inset.value = keyboardInset(window.innerHeight, viewport)
    }
    useEventListener(viewport, 'resize', update, { passive: true })
    useEventListener(viewport, 'scroll', update, { passive: true })
    update()
  }
  return { inset }
}
