// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/vue-3'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { toStoredBody } from '../markdown'
import { moveBlock } from './block-move'

let editor: Editor | undefined
afterEach(() => editor?.destroy())

function editorAt(markdown: string, text: string) {
  editor = createHeadlessEditor(markdown)
  let target = 0
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text?.includes(text)) target = pos + 1
  })
  editor.commands.setTextSelection(target)
  return editor
}

describe('moveBlock', () => {
  it('moves the block at the cursor up and keeps the cursor in it', () => {
    const e = editorAt('one\n\ntwo\n\nthree', 'three')
    e.view.dispatch(moveBlock(e.state, 'up')!)
    expect(e.getMarkdown()).toBe('one\n\nthree\n\ntwo')
    expect(e.state.selection.$from.parent.textContent).toBe('three')
  })

  it('moves a whole list down', () => {
    const e = editorAt('- a\n- b\n\nafter', 'b')
    e.view.dispatch(moveBlock(e.state, 'down')!)
    expect(toStoredBody(e.getMarkdown())).toBe('after\n\n- a\n- b\n')
  })

  it('returns null at the edges', () => {
    const e = editorAt('one\n\ntwo', 'one')
    expect(moveBlock(e.state, 'up')).toBeNull()
    e.commands.setTextSelection(e.state.doc.content.size - 1)
    expect(moveBlock(e.state, 'down')).toBeNull()
  })

  it('is bound to Alt+Arrow keys', () => {
    const e = editorAt('one\n\ntwo', 'two')
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true })
    e.view.someProp('handleKeyDown', handler => handler(e.view, event))
    expect(e.getMarkdown()).toBe('two\n\none')
  })
})
