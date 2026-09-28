// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createHeadlessEditor, roundTrip } from '../../../test/utils/headless-editor'
import { toStoredBody } from '../markdown'

const golden = readFileSync(join(import.meta.dirname, '../golden/blocks.md'), 'utf8')

describe('custom blocks', () => {
  it('round-trip byte-identical (note, callout, codex card, scene break, unknown directives)', () => {
    expect(toStoredBody(roundTrip(golden))).toBe(golden)
  })

  it('parse into their nodes with attributes and nested blocks', () => {
    const editor = createHeadlessEditor(golden)
    const nodes = editor.getJSON().content!
    expect(nodes.map(node => node.type)).toEqual(['paragraph', 'noteBlock', 'calloutBlock', 'codexCard', 'sceneBreak', 'paragraph', 'horizontalRule', 'rawDirective', 'rawDirective'])
    expect(nodes[1]).toMatchObject({ attrs: { todo: 'open' }, content: [{ type: 'paragraph' }, { type: 'bulletList' }] })
    expect(nodes[2]).toMatchObject({ attrs: { variant: 'tip' } })
    expect(nodes[3]).toMatchObject({ attrs: { id: 'cdx_mara000001' } })
    editor.destroy()
  })

  it('are inserted by commands and serialize as directives', () => {
    const inserted = (run: (editor: ReturnType<typeof createHeadlessEditor>) => void) => {
      const editor = createHeadlessEditor('Text')
      editor.commands.setTextSelection(editor.state.doc.content.size)
      run(editor)
      const markdown = toStoredBody(editor.getMarkdown()).trimEnd()
      editor.destroy()
      return markdown
    }
    expect(inserted(editor => editor.commands.insertSceneBreak())).toBe('Text\n\n* * *')
    expect(inserted(editor => editor.commands.insertCodexCard('cdx_1'))).toBe('Text\n\n::codex-card{id=cdx_1}')
    expect(inserted(editor => editor.commands.insertCallout('warning'))).toBe('Text\n\n:::callout{variant=warning}\n\n:::')
    expect(inserted(editor => editor.commands.insertNote())).toBe('Text\n\n:::note{todo=open}\n\n:::')
  })

  it('keep an empty container and a bad variant sensible', () => {
    expect(roundTrip(':::note\n:::')).toBe(':::note\n\n:::')
    expect(roundTrip(':::callout{variant=shout}\nHi\n:::')).toBe(':::callout{variant=info}\nHi\n:::')
  })
})
