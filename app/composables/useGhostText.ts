import type { Editor } from '@tiptap/vue-3'
import { useDebounceFn } from '@vueuse/core'
import type { AutocompleteContext } from '~/editor/autocomplete-context'
import { completionPoint, setGhostText } from '~/editor/extensions/ghost-text'

export const GHOST_DELAY_MS = 900

/**
 * Asks for a ghost-text completion after a typing pause at the end of a paragraph – only while autocomplete
 * is enabled (no requests otherwise). A newer edit aborts the pending request; a stale answer is dropped.
 */
export function useGhostText(editor: MaybeRefOrGetter<Editor>, context: AutocompleteContext | null, delay = GHOST_DELAY_MS) {
  let controller: AbortController | null = null

  const request = useDebounceFn(async () => {
    const view = liveView(toValue(editor))
    const point = view && context?.enabled.value ? completionPoint(view.state) : null
    if (!view || !point || !context) return
    controller = new AbortController()
    const doc = view.state.doc
    const text = await context.complete(point.before, controller.signal).catch(() => '')
    // Drop answers that arrive after the author typed on or moved the cursor.
    if (text.trim() && !view.isDestroyed && view.state.doc === doc && view.state.selection.from === point.pos) view.dispatch(setGhostText(view.state, text, point.pos))
  }, delay)

  function onUpdate() {
    controller?.abort()
    controller = null
    if (context?.enabled.value) void request()
  }

  onMounted(() => toValue(editor).on('update', onUpdate))
  onBeforeUnmount(() => {
    controller?.abort()
    toValue(editor).off('update', onUpdate)
  })
}
