// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/vue-3'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'

let editor: Editor | undefined
afterEach(() => editor?.destroy())

function typeText(e: Editor, text: string) {
  for (const char of text) {
    const { from, to } = e.state.selection
    const handled = e.view.someProp('handleTextInput', handler => handler(e.view, from, to, char, () => e.state.tr.insertText(char, from, to)))
    if (!handled) e.view.dispatch(e.state.tr.insertText(char, from, to))
  }
}

describe('wiki link input rule', () => {
  it('turns typed [[Target|Label]] into a link node', () => {
    editor = createHeadlessEditor('')
    editor.commands.focus('end')
    typeText(editor, 'See [[Hollow Bay|the bay]]')
    const json = JSON.stringify(editor.getJSON())
    expect(json).toContain('"type":"wikiLink"')
    expect(editor.getMarkdown()).toBe('See [[Hollow Bay|the bay]]')
  })
})
