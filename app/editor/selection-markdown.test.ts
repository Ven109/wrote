// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { blockMarkdown, selectionMarkdown } from './selection-markdown'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const body = 'The tide was **out** when Mara reached [[Hollow Bay]].\n\nShe had promised herself.'

describe('selection and block Markdown', () => {
  it('serializes a partial selection exactly as it appears in the saved body', () => {
    editor = createHeadlessEditor(body)
    const text = editor.state.doc.textContent
    const from = text.indexOf('tide') + 1
    editor.commands.setTextSelection({ from, to: from + 'tide was out'.length })
    const selected = selectionMarkdown(editor)
    expect(selected).toBe('tide was **out**')
    expect(editor.getMarkdown()).toContain(selected)
  })

  it('serializes whole blocks, including wiki links', () => {
    editor = createHeadlessEditor(body)
    const first = blockMarkdown(editor, 0)
    expect(first).toBe('The tide was **out** when Mara reached [[Hollow Bay]].')
    expect(editor.getMarkdown()).toContain(first)
    expect(blockMarkdown(editor, editor.state.doc.child(0).nodeSize)).toBe('She had promised herself.')
  })

  it('is empty without a selection', () => {
    editor = createHeadlessEditor(body)
    editor.commands.setTextSelection(3)
    expect(selectionMarkdown(editor)).toBe('')
  })
})
