import { Extension } from '@tiptap/core'
import { NodeSelection, Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { FocusScope } from '#shared/schemas/writing-modes'
import { inlineText, sentenceBounds } from '../focus-range'

export interface FocusModeState {
  enabled: boolean
  scope: FocusScope
  decorations: DecorationSet
}

export const focusModeKey = new PluginKey<FocusModeState>('focusMode')

/**
 * The few decorations focus mode needs around the caret: the current block is marked `focus-current` (CSS dims
 * its siblings and everything outside its ancestors); in sentence scope the rest of that block gets `focus-dim`.
 * O(depth) per selection change – never a document scan.
 */
export function focusDecorations(state: EditorState, scope: FocusScope): DecorationSet {
  const { selection, doc } = state
  if (selection instanceof NodeSelection) return DecorationSet.create(doc, [Decoration.node(selection.from, selection.to, { class: 'focus-current' })])
  const $head = selection.$head
  if (!$head.parent.isTextblock || $head.depth === 0) return DecorationSet.empty
  const decorations = [Decoration.node($head.before(), $head.after(), { class: 'focus-current' })]
  if (scope === 'sentence') {
    const text = inlineText($head.parent)
    const { from, to } = sentenceBounds(text, $head.parentOffset)
    const start = $head.start()
    if (from > 0) decorations.push(Decoration.inline(start, start + from, { class: 'focus-dim' }))
    if (to < text.length) decorations.push(Decoration.inline(start + to, $head.end(), { class: 'focus-dim' }))
  }
  return DecorationSet.create(doc, decorations)
}

type FocusModeMeta = Pick<FocusModeState, 'enabled' | 'scope'>

/**
 * Focus mode: dims everything but the paragraph (or sentence) at the caret. Decorations and a root class only –
 * the document and its Markdown never change. Turn it on/off and pick the scope with `setFocusMode`.
 */
export const FocusMode = Extension.create({
  name: 'focusMode',
  addProseMirrorPlugins() {
    return [new Plugin<FocusModeState>({
      key: focusModeKey,
      state: {
        init: () => ({ enabled: false, scope: 'paragraph', decorations: DecorationSet.empty }),
        apply(tr: Transaction, value: FocusModeState, _old: EditorState, state: EditorState) {
          const meta = tr.getMeta(focusModeKey) as FocusModeMeta | undefined
          const next = meta ? { ...value, ...meta } : value
          if (!next.enabled) return next.decorations === DecorationSet.empty ? next : { ...next, decorations: DecorationSet.empty }
          if (!meta && !tr.docChanged && !tr.selectionSet) return value
          return { ...next, decorations: focusDecorations(state, next.scope) }
        },
      },
      props: {
        decorations: state => focusModeKey.getState(state)?.decorations,
        attributes: (state): Record<string, string> => {
          const plugin = focusModeKey.getState(state)
          return plugin?.enabled ? { 'class': 'focus-mode', 'data-focus-scope': plugin.scope } : {}
        },
      },
    })]
  },
})

export function setFocusMode(state: EditorState, settings: FocusModeMeta): Transaction {
  return state.tr.setMeta(focusModeKey, settings).setMeta('addToHistory', false)
}
