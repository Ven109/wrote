import type { Editor } from '@tiptap/vue-3'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/**
 * The editor's view while it is mounted, otherwise null. UEditor destroys the editor before its children
 * unmount (e.g. when navigating away), and `editor.view` throws once it is gone.
 */
export function liveView(editor: Editor | null | undefined): EditorView | null {
  return editor && !editor.isDestroyed ? editor.view : null
}

/**
 * Safe access for components that feed page state into the editor: transactions are only dispatched while
 * the view is alive, and DOM listeners are removed from the element they were added to.
 */
export function useEditorBridge(editor: MaybeRefOrGetter<Editor>) {
  const dom = shallowRef<HTMLElement | null>(null)

  /** Dispatches the transaction built from the current state (no-op while the editor is not mounted). */
  function dispatch(build: (state: EditorState) => Transaction) {
    const view = liveView(toValue(editor))
    if (view) view.dispatch(build(view.state))
  }

  const listeners: [string, EventListener][] = []
  /** Listens to an event on the editor's DOM for as long as the calling component is mounted. */
  function listen(event: string, handler: EventListener) {
    listeners.push([event, handler])
  }

  onMounted(() => {
    dom.value = liveView(toValue(editor))?.dom ?? null
    for (const [event, handler] of listeners) dom.value?.addEventListener(event, handler)
  })
  onBeforeUnmount(() => {
    for (const [event, handler] of listeners) dom.value?.removeEventListener(event, handler)
  })

  return { dom, dispatch, listen }
}
