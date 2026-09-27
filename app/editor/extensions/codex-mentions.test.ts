// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/vue-3'
import { createNameMatcher } from '#shared/utils/name-matcher'
import { createHeadlessEditor } from '../../../test/utils/headless-editor'
import { toStoredBody } from '../markdown'
import { codexMentionsKey, setCodexMatcher } from './codex-mentions'

let editor: Editor | undefined
afterEach(() => editor?.destroy())

const matcher = createNameMatcher([{ name: 'Mara', entryId: 'mara' }, { name: 'Hollow Bay', entryId: 'bay' }])

function mentions(e: Editor) {
  const set = codexMentionsKey.getState(e.state)!.decorations
  return set.find().map(d => [e.state.doc.textBetween(d.from, d.to), (d as unknown as { type: { attrs: Record<string, string> } }).type.attrs['data-entry-id']])
}

function setup(markdown: string) {
  editor = createHeadlessEditor(markdown)
  editor.view.dispatch(setCodexMatcher(editor.state, matcher))
  return editor
}

describe('codex mention decorations', () => {
  it('decorates names across blocks but not in code or links, without touching the Markdown', () => {
    const e = setup('Mara reached Hollow Bay.\n\n`Mara` in code and [[Mara]] as a link.\n\n## Mara')
    expect(mentions(e)).toEqual([['Mara', 'mara'], ['Hollow Bay', 'bay'], ['Mara', 'mara']])
    expect(toStoredBody(e.getMarkdown())).toBe('Mara reached Hollow Bay.\n\n`Mara` in code and [[Mara]] as a link.\n\n## Mara\n')
  })

  it('updates incrementally while typing', () => {
    const e = setup('First line.\n\nSecond line.')
    expect(mentions(e)).toEqual([])
    e.commands.setTextSelection(e.state.doc.content.size - 1)
    e.commands.insertContent(' Mara')
    expect(mentions(e)).toEqual([['Mara', 'mara']])
    e.commands.setTextSelection({ from: 1, to: 6 })
    e.commands.insertContent('Hollow Bay')
    expect(mentions(e).map(([name]) => name)).toEqual(['Hollow Bay', 'Mara'])
    e.commands.undo()
    e.commands.undo()
    expect(mentions(e)).toEqual([])
  })

  it('stays under 5ms per keystroke on a 10k-word scene', () => {
    const paragraph = 'The tide was out when Mara reached the harbor, and the gulls were loud above the water again.'
    const e = setup(Array.from({ length: 550 }, () => paragraph).join('\n\n'))
    expect(mentions(e)).toHaveLength(550)
    e.commands.setTextSelection(e.state.doc.content.size / 2)
    const samples: number[] = []
    for (let i = 0; i < 50; i++) {
      const started = performance.now()
      e.view.dispatch(e.state.tr.insertText(i % 5 === 0 ? ' Mara' : 'x'))
      samples.push(performance.now() - started)
    }
    const median = samples.sort((a, b) => a - b)[25]!
    expect(median).toBeLessThan(5)
  })
})
