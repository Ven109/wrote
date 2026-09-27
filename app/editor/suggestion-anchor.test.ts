// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { docTextIndex, locateSuggestion, markdownToDocText } from './suggestion-anchor'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const textAt = (range: { from: number, to: number } | null) => (range ? editor.state.doc.textBetween(range.from, range.to, '\n', '\uFFFC') : null)

describe('suggestion anchors in the editor document', () => {
  it('reads Markdown the way the editor shows it', () => {
    expect(markdownToDocText('**Mara** met [[Hollow Bay]] at [the pier](x).\n\nNext')).toBe('Mara met \uFFFC at the pier.\u2029Next')
  })

  it('finds plain, formatted and multi-paragraph passages', () => {
    editor = createHeadlessEditor('The tide was **out** when Mara reached [[Hollow Bay]].\n\nShe had promised herself.\n')
    expect(textAt(locateSuggestion(editor.state.doc, { find: 'tide was **out**', before: '', after: '' }))).toBe('tide was out')
    expect(textAt(locateSuggestion(editor.state.doc, { find: 'reached [[Hollow Bay]].', before: '', after: '' }))).toBe('reached \uFFFC.')
    expect(textAt(locateSuggestion(editor.state.doc, { find: 'Hollow Bay]].\n\nShe had', before: '', after: '' }))).toBeNull()
    expect(textAt(locateSuggestion(editor.state.doc, { find: 'Bay]].\n\nShe had', before: '', after: '' }))).toBeNull()
    expect(textAt(locateSuggestion(editor.state.doc, { find: '.\n\nShe had', before: '', after: '' }))).toBe('.\nShe had')
  })

  it('disambiguates repeated passages by context and reports missing ones', () => {
    editor = createHeadlessEditor('The door opened.\n\nHe waited. The door closed.\n')
    const range = locateSuggestion(editor.state.doc, { find: 'The door', before: 'He waited. ', after: ' closed.' })
    expect(editor.state.doc.textBetween(range!.from, range!.to + 7)).toBe('The door closed')
    expect(locateSuggestion(editor.state.doc, { find: 'The window', before: '', after: '' })).toBeNull()
  })

  it('maps every character of the flat text to a document position', () => {
    editor = createHeadlessEditor('A  b\n\nc\n')
    const index = docTextIndex(editor.state.doc)
    expect(index.text).toBe('A b\u2029c')
    expect(index.positions).toHaveLength(index.text.length)
  })
})
