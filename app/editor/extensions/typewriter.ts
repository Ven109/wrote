import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export const typewriterKey = new PluginKey<boolean>('typewriter')

/** How far to scroll so the caret line sits in the vertical middle of the viewport (positive = scroll down). */
export function typewriterDelta(caret: { top: number, bottom: number }, viewport: { top: number, height: number }): number {
  const caretMiddle = (caret.top + caret.bottom) / 2
  return Math.round(caretMiddle - (viewport.top + viewport.height / 2))
}

/** Nearest ancestor that actually scrolls vertically, or `null` when the window does. */
export function scrollParent(element: HTMLElement): HTMLElement | null {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node)
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node
  }
  return null
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Scrolls the editor's scroll container so the caret is vertically centred. */
export function centerCaret(view: EditorView): void {
  const scroller = scrollParent(view.dom)
  const caret = view.coordsAtPos(view.state.selection.head)
  const viewport = scroller
    ? scroller.getBoundingClientRect()
    : { top: window.visualViewport?.offsetTop ?? 0, height: window.visualViewport?.height ?? window.innerHeight }
  const delta = typewriterDelta(caret, viewport)
  if (Math.abs(delta) < 2) return
  ;(scroller ?? window).scrollBy({ top: delta, behavior: prefersReducedMotion() ? 'instant' : 'smooth' })
}

/**
 * Typewriter scrolling: while on, every caret move or edit (while the editor has focus) scrolls so the caret line
 * stays vertically centred. The `typewriter-mode` root class adds padding at the start and end of the document
 * so the first and last lines can reach the middle too. Toggle with `setTypewriter`.
 */
export const Typewriter = Extension.create({
  name: 'typewriter',
  addProseMirrorPlugins() {
    return [new Plugin<boolean>({
      key: typewriterKey,
      state: {
        init: () => false,
        apply: (tr: Transaction, value: boolean) => (tr.getMeta(typewriterKey) as boolean | undefined) ?? value,
      },
      props: {
        attributes: (state): Record<string, string> => (typewriterKey.getState(state) ? { class: 'typewriter-mode' } : {}),
      },
      view: () => ({
        update(view, previous) {
          if (!typewriterKey.getState(view.state)) return
          const turnedOn = !typewriterKey.getState(previous)
          const moved = previous.doc !== view.state.doc || !previous.selection.eq(view.state.selection)
          if (turnedOn || (moved && view.hasFocus())) centerCaret(view)
        },
      }),
    })]
  },
})

export function setTypewriter(state: EditorState, enabled: boolean): Transaction {
  return state.tr.setMeta(typewriterKey, enabled).setMeta('addToHistory', false)
}
