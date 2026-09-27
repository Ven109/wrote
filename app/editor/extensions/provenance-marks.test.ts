// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { provenanceKey, provenanceLabel, setProvenanceRanges } from './provenance-marks'

let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

const range = { id: 'prv_1', text: 'creased along the lines', before: 'The map was ', after: '.', author: { kind: 'assistant' as const, name: 'AI · Rephrase' }, model: 'ollama:tiny', acceptedAt: '2026-09-27T10:00:00.000Z' }

describe('provenance highlights', () => {
  it('highlights AI-assisted passages as decorations only', () => {
    editor = createHeadlessEditor('The map was creased along the lines.')
    editor.view.dispatch(setProvenanceRanges(editor.state, [range]))
    const [decoration] = provenanceKey.getState(editor.state)!.find()
    expect(editor.state.doc.textBetween(decoration!.from, decoration!.to)).toBe('creased along the lines')
    expect(editor.getMarkdown()).toBe('The map was creased along the lines.')
  })

  it('hides highlights and skips passages that are gone', () => {
    editor = createHeadlessEditor('Something else.')
    editor.view.dispatch(setProvenanceRanges(editor.state, [range]))
    expect(provenanceKey.getState(editor.state)!.find()).toEqual([])
    editor.view.dispatch(setProvenanceRanges(editor.state, []))
    expect(provenanceKey.getState(editor.state)!.find()).toEqual([])
  })

  it('labels who wrote a passage with which model', () => {
    expect(provenanceLabel(range)).toMatch(/^AI-assisted: AI · Rephrase · ollama:tiny · accepted /)
    expect(provenanceLabel({ ...range, model: null })).not.toContain('null')
  })
})
