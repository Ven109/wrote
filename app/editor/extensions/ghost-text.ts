import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export const ghostTextKey = new PluginKey<GhostState>('ghostText')

interface GhostState {
  text: string | null
  pos: number
}

function ghostWidget(text: string): HTMLElement {
  const span = document.createElement('span')
  span.className = 'ghost-text'
  span.textContent = text
  span.setAttribute('aria-hidden', 'true')
  return span
}

/**
 * Ghost-text autocomplete: a greyed-out continuation at the cursor (decoration only). Tab accepts it,
 * Escape or any edit or cursor move dismisses it. Completions are fed with `setGhostText`.
 */
export const GhostText = Extension.create({
  name: 'ghostText',
  addProseMirrorPlugins() {
    return [new Plugin<GhostState>({
      key: ghostTextKey,
      state: {
        init: () => ({ text: null, pos: 0 }),
        apply(tr: Transaction, value: GhostState): GhostState {
          const next = tr.getMeta(ghostTextKey) as GhostState | undefined
          if (next) return next
          return tr.docChanged || tr.selectionSet ? { text: null, pos: 0 } : value
        },
      },
      props: {
        decorations(state) {
          const ghost = ghostTextKey.getState(state)
          return ghost?.text ? DecorationSet.create(state.doc, [Decoration.widget(ghost.pos, () => ghostWidget(ghost.text!), { side: 1 })]) : null
        },
        handleKeyDown(view, event) {
          const ghost = ghostTextKey.getState(view.state)
          if (!ghost?.text) return false
          if (event.key === 'Tab') {
            view.dispatch(view.state.tr.insertText(ghost.text, ghost.pos))
            return true
          }
          if (event.key === 'Escape') {
            view.dispatch(view.state.tr.setMeta(ghostTextKey, { text: null, pos: 0 }))
            return true
          }
          return false
        },
      },
    })]
  },
})

export function setGhostText(state: EditorState, text: string | null, pos = state.selection.from): Transaction {
  return state.tr.setMeta(ghostTextKey, { text, pos }).setMeta('addToHistory', false)
}

/** Where a completion makes sense: an empty selection at the end of a non-code textblock with some text. */
export function completionPoint(state: EditorState): { pos: number, before: string } | null {
  const { selection } = state
  const { $from } = selection
  if (!selection.empty || !$from.parent.isTextblock || $from.parent.type.spec.code || $from.parentOffset !== $from.parent.content.size) return null
  const before = state.doc.textBetween(Math.max(0, $from.pos - 2000), $from.pos, '\n\n')
  return before.trim().length >= 20 && !/\s{2,}$/.test(before) ? { pos: $from.pos, before } : null
}
