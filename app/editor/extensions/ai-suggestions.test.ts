// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { Suggestion } from '#shared/schemas/suggestion'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { applySuggestion } from '../suggestion-apply'
import { aiSuggestionsKey, setSuggestions, suggestionRange } from './ai-suggestions'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const author = { kind: 'mcp' as const, name: 'Claude Desktop' }
const suggestion = (id: string, overrides: Partial<Suggestion> = {}) => ({ id, kind: 'replace' as const, find: 'tired creases', replace: 'old creases', before: '', after: '', author, ...overrides })
const body = 'Her father\'s map was still in the drawer, folded along the same tired creases.\n\nShe left it there.\n'

function show(markdown: string, suggestions: ReturnType<typeof suggestion>[]) {
  editor = createHeadlessEditor(markdown)
  editor.view.dispatch(setSuggestions(editor.state, suggestions))
}

describe('AI suggestions in the editor', () => {
  it('shows a replacement as struck original plus proposal, without touching the Markdown', () => {
    show(body, [suggestion('sug_a000000001')])
    const decorations = aiSuggestionsKey.getState(editor.state)!.decorations.find()
    expect(decorations).toHaveLength(2)
    const range = suggestionRange(editor.state, 'sug_a000000001')!
    expect(editor.state.doc.textBetween(range.from, range.to)).toBe('tired creases')
    expect(editor.getMarkdown()).toBe(body.trimEnd())
  })

  it('skips suggestions whose passage is gone', () => {
    show(body, [suggestion('sug_a000000001', { find: 'the compass' })])
    expect(aiSuggestionsKey.getState(editor.state)!.decorations.find()).toEqual([])
  })

  it('follows edits elsewhere in the document', () => {
    show(body, [suggestion('sug_a000000001')])
    editor.commands.insertContentAt(1, 'Yesterday. ')
    const range = suggestionRange(editor.state, 'sug_a000000001')!
    expect(editor.state.doc.textBetween(range.from, range.to)).toBe('tired creases')
  })

  it('applies an accepted replacement (Markdown parsed) as an undoable edit', () => {
    show(body, [suggestion('sug_a000000001', { replace: '*worn* creases' })])
    expect(applySuggestion(editor, suggestion('sug_a000000001', { replace: '*worn* creases' }))).toBe(true)
    expect(editor.getMarkdown()).toContain('folded along the same *worn* creases.')
    editor.commands.undo()
    expect(editor.getMarkdown()).toContain('the same tired creases.')
  })

  it('applies the author\'s edited text and deletions', () => {
    show(body, [suggestion('sug_a000000001')])
    applySuggestion(editor, suggestion('sug_a000000001'), 'deep creases')
    expect(editor.getMarkdown()).toContain('the same deep creases.')
    applySuggestion(editor, suggestion('sug_b000000001', { find: ' She left it there.' }), '')
    applySuggestion(editor, suggestion('sug_c000000001', { find: 'She left it there.' }), '')
    expect(editor.getMarkdown()).not.toContain('She left it there')
  })

  it('inserts a proposed block after the paragraph that contains the anchor', () => {
    show(body, [suggestion('sug_i000000001', { kind: 'insert', find: 'tired creases', replace: 'The ink had faded.' })])
    expect(aiSuggestionsKey.getState(editor.state)!.decorations.find().some(d => (d.spec as { side?: number }).side === 1)).toBe(true)
    applySuggestion(editor, suggestion('sug_i000000001', { kind: 'insert', find: 'tired creases', replace: 'The ink had faded.' }))
    expect(editor.getMarkdown()).toBe('Her father\'s map was still in the drawer, folded along the same tired creases.\n\nThe ink had faded.\n\nShe left it there.')
  })

  it('reports stale suggestions instead of applying them', () => {
    show(body, [])
    expect(applySuggestion(editor, suggestion('sug_a000000001', { find: 'the compass' }))).toBe(false)
  })
})
