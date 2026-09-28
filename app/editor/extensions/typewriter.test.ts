// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { setTypewriter, typewriterDelta, typewriterKey } from './typewriter'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => {
  editor?.destroy()
  vi.restoreAllMocks()
})

describe('typewriterDelta', () => {
  it.each([
    [{ top: 490, bottom: 510 }, 0],
    [{ top: 790, bottom: 810 }, 300],
    [{ top: 90, bottom: 110 }, -400],
  ])('scrolls a caret at %o by %i to centre it', (caret, delta) => {
    expect(typewriterDelta(caret, { top: 0, height: 1000 })).toBe(delta)
  })

  it('centres within a scroll container that does not start at the top of the window', () => {
    expect(typewriterDelta({ top: 560, bottom: 580 }, { top: 60, height: 1000 })).toBe(10)
  })
})

describe('typewriter extension', () => {
  it('adds the padding class only while on and leaves the Markdown alone', () => {
    editor = createHeadlessEditor('One\n\nTwo')
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 })
    editor.view.dispatch(setTypewriter(editor.state, true))
    expect(typewriterKey.getState(editor.state)).toBe(true)
    expect(editor.view.dom.classList.contains('typewriter-mode')).toBe(true)
    expect(editor.getMarkdown()).toBe('One\n\nTwo')
    editor.view.dispatch(setTypewriter(editor.state, false))
    expect(editor.view.dom.classList.contains('typewriter-mode')).toBe(false)
  })

  it('recentres when turned on and on caret moves while focused', () => {
    editor = createHeadlessEditor('One\n\nTwo')
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ top: 5000, bottom: 5020, left: 0, right: 0 })
    vi.spyOn(editor.view, 'hasFocus').mockReturnValue(true)
    editor.view.dispatch(setTypewriter(editor.state, true))
    editor.commands.setTextSelection(6)
    expect(scroll).toHaveBeenCalledTimes(2)
    expect(scroll.mock.calls[0]![0]).toMatchObject({ top: typewriterDelta({ top: 5000, bottom: 5020 }, { top: 0, height: window.innerHeight }) })
  })

  it('does not scroll on changes while the editor is not focused', () => {
    editor = createHeadlessEditor('One\n\nTwo')
    vi.spyOn(editor.view, 'coordsAtPos').mockReturnValue({ top: 5000, bottom: 5020, left: 0, right: 0 })
    editor.view.dispatch(setTypewriter(editor.state, true))
    const scroll = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    vi.spyOn(editor.view, 'hasFocus').mockReturnValue(false)
    editor.commands.setTextSelection(6)
    expect(scroll).not.toHaveBeenCalled()
  })
})
