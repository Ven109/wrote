// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { completionPoint, ghostTextKey, setGhostText } from './ghost-text'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const press = (key: string) => editor.view.someProp('handleKeyDown', f => f(editor.view, new KeyboardEvent('keydown', { key })))

describe('ghost text', () => {
  it('offers a completion point only at the end of a paragraph with some text', () => {
    editor = createHeadlessEditor('The tide was out when Mara reached the bay.\n\nShort.')
    editor.commands.setTextSelection(44)
    expect(completionPoint(editor.state)).toMatchObject({ pos: 44, before: 'The tide was out when Mara reached the bay.' })
    editor.commands.setTextSelection(10)
    expect(completionPoint(editor.state)).toBeNull()
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    expect(completionPoint(editor.state)?.before).toContain('Short.')
  })

  it('shows the completion as a decoration, accepts it with Tab and keeps the Markdown clean until then', () => {
    editor = createHeadlessEditor('The tide was out')
    editor.commands.setTextSelection(17)
    editor.view.dispatch(setGhostText(editor.state, ' when Mara came home.'))
    expect(editor.getMarkdown()).toBe('The tide was out')
    expect(ghostTextKey.getState(editor.state)?.text).toBe(' when Mara came home.')
    expect(press('Tab')).toBe(true)
    expect(editor.getMarkdown()).toBe('The tide was out when Mara came home.')
    expect(ghostTextKey.getState(editor.state)?.text).toBeNull()
  })

  it('dismisses with Escape, typing or moving the cursor', () => {
    editor = createHeadlessEditor('The tide was out')
    editor.commands.setTextSelection(17)
    editor.view.dispatch(setGhostText(editor.state, ' again.'))
    expect(press('Escape')).toBe(true)
    expect(ghostTextKey.getState(editor.state)?.text).toBeNull()
    editor.view.dispatch(setGhostText(editor.state, ' again.'))
    editor.commands.insertContent('!')
    expect(ghostTextKey.getState(editor.state)?.text).toBeNull()
    expect(press('Tab')).toBeFalsy()
  })
})
