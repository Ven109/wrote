// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { focusModeKey, setFocusMode } from './focus-mode'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const MARKDOWN = 'The tide was out. Mara ran!\n\nSecond paragraph.'
const decorations = () => (focusModeKey.getState(editor.state)?.decorations.find() ?? [])
  .map(d => ({ class: (d as unknown as { type: { attrs: { class: string } } }).type.attrs.class, text: editor.state.doc.textBetween(d.from, d.to) }))

describe('focus mode', () => {
  it('does nothing until turned on', () => {
    editor = createHeadlessEditor(MARKDOWN)
    editor.commands.setTextSelection(5)
    expect(decorations()).toEqual([])
    expect(editor.view.dom.classList.contains('focus-mode')).toBe(false)
  })

  it('marks the paragraph at the caret and follows the caret', () => {
    editor = createHeadlessEditor(MARKDOWN)
    editor.commands.setTextSelection(5)
    editor.view.dispatch(setFocusMode(editor.state, { enabled: true, scope: 'paragraph' }))
    expect(editor.view.dom.classList.contains('focus-mode')).toBe(true)
    expect(decorations()).toEqual([{ class: 'focus-current', text: 'The tide was out. Mara ran!' }])
    editor.commands.setTextSelection(editor.state.doc.content.size - 2)
    expect(decorations()).toEqual([{ class: 'focus-current', text: 'Second paragraph.' }])
  })

  it('dims the rest of the paragraph around the current sentence', () => {
    editor = createHeadlessEditor(MARKDOWN)
    editor.commands.setTextSelection(22)
    editor.view.dispatch(setFocusMode(editor.state, { enabled: true, scope: 'sentence' }))
    expect(editor.view.dom.dataset.focusScope).toBe('sentence')
    expect(decorations()).toEqual([
      { class: 'focus-current', text: 'The tide was out. Mara ran!' },
      { class: 'focus-dim', text: 'The tide was out. ' },
    ])
  })

  it('never changes the document or its Markdown, and clears when turned off', () => {
    editor = createHeadlessEditor(MARKDOWN)
    editor.view.dispatch(setFocusMode(editor.state, { enabled: true, scope: 'sentence' }))
    editor.commands.insertContent('Now ')
    expect(editor.getMarkdown()).toBe(`Now ${MARKDOWN}`)
    editor.view.dispatch(setFocusMode(editor.state, { enabled: false, scope: 'sentence' }))
    expect(decorations()).toEqual([])
    expect(editor.view.dom.classList.contains('focus-mode')).toBe(false)
  })
})
