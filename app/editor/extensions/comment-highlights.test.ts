// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { COMMENT_FOCUS_EVENT, commentHighlightsKey, commentPositions, setCommentHighlights } from './comment-highlights'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const comment = (id: string, quote: string) => ({ id, quote, before: '', after: '' })

describe('comment highlights', () => {
  it('highlights commented passages as decorations only and reports where they start', () => {
    editor = createHeadlessEditor('The tide was out.\n\nThe map was creased.')
    editor.view.dispatch(setCommentHighlights(editor.state, [comment('cmt_1', 'map was creased'), comment('cmt_2', 'gone')], 'cmt_1'))
    const [decoration] = commentHighlightsKey.getState(editor.state)!.find()
    expect(editor.state.doc.textBetween(decoration!.from, decoration!.to)).toBe('map was creased')
    expect((decoration as unknown as { type: { attrs: { class: string } } }).type.attrs.class).toContain('comment-highlight-active')
    expect([...commentPositions(editor.state).keys()]).toEqual(['cmt_1'])
    expect(editor.getMarkdown()).toBe('The tide was out.\n\nThe map was creased.')
  })

  it('keeps highlights on their passage while the author types elsewhere, and focuses a comment on click', () => {
    editor = createHeadlessEditor('The tide was out.')
    editor.view.dispatch(setCommentHighlights(editor.state, [comment('cmt_1', 'tide was out')]))
    editor.commands.insertContentAt(1, 'Oh. ')
    const from = commentPositions(editor.state).get('cmt_1')!
    expect(editor.state.doc.textBetween(from, from + 12)).toBe('tide was out')
    const focused = vi.fn()
    editor.view.dom.addEventListener(COMMENT_FOCUS_EVENT, event => focused((event as CustomEvent<string>).detail))
    editor.view.someProp('handleClick', handler => handler(editor.view, from + 1, new MouseEvent('click')))
    expect(focused).toHaveBeenCalledWith('cmt_1')
  })
})
