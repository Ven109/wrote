import { Extension } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { TextSelection } from '@tiptap/pm/state'

export type MoveDirection = 'up' | 'down'

/**
 * Moves the top-level block containing the cursor one position up or down, keeping the cursor inside it.
 * Returns `null` when the block is already at the edge.
 */
export function moveBlock(state: EditorState, direction: MoveDirection): Transaction | null {
  const { $from } = state.selection
  if ($from.depth < 1) return null
  const index = $from.index(0)
  const doc = state.doc
  const neighbourIndex = direction === 'up' ? index - 1 : index + 1
  if (neighbourIndex < 0 || neighbourIndex >= doc.childCount) return null

  const block = doc.child(index)
  const neighbour = doc.child(neighbourIndex)
  const start = $from.before(1)
  const offsetInBlock = state.selection.from - start
  const tr = state.tr.delete(start, start + block.nodeSize)
  const insertAt = direction === 'up' ? start - neighbour.nodeSize : start + neighbour.nodeSize
  tr.insert(insertAt, block)
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + offsetInBlock)))
  return tr.scrollIntoView()
}

/** Keyboard block moves (`Alt+↑` / `Alt+↓`), available in both editor modes. */
export const BlockMove = Extension.create({
  name: 'blockMove',
  addKeyboardShortcuts() {
    const run = (direction: MoveDirection) => () => {
      const tr = moveBlock(this.editor.state, direction)
      if (!tr) return false
      this.editor.view.dispatch(tr)
      return true
    }
    return { 'Alt-ArrowUp': run('up'), 'Alt-ArrowDown': run('down') }
  },
})
