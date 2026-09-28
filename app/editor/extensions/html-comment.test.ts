// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor, roundTrip } from '../../../test/utils/headless-editor'

let editor: ReturnType<typeof createHeadlessEditor> | undefined
afterEach(() => editor?.destroy())

describe('HTML comment blocks', () => {
  it('keeps block comments (e.g. outline markers) as atoms', () => {
    editor = createHeadlessEditor('## Act\n\n<!-- wrote:act id=act_1 -->\n\nText.')
    expect(editor.state.doc.child(1).type.name).toBe('htmlComment')
    expect(editor.getMarkdown()).toBe('## Act\n\n<!-- wrote:act id=act_1 -->\n\nText.')
  })

  it('keeps multi-line comments', () => {
    expect(roundTrip('<!--\nline one\nline two\n-->\n\nAfter.')).toBe('<!--\nline one\nline two\n-->\n\nAfter.')
  })
})
