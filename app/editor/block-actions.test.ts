// @vitest-environment happy-dom
import type { Editor } from '@tiptap/vue-3'
import type { EditorHandlers } from '@nuxt/ui'
import { createHandlers } from '@nuxt/ui/utils/editor'
import { afterEach, describe, expect, it } from 'vitest'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { toStoredBody } from './markdown'
import { blockPosAtCursor, canRunBlockAction, NODE_ACTIONS, runBlockAction, TURN_INTO_ACTIONS } from './block-actions'

const handlers = createHandlers() as EditorHandlers
const action = (id: string) => [...TURN_INTO_ACTIONS, ...NODE_ACTIONS].find(a => a.id === id)!
let editor: Editor | undefined
afterEach(() => editor?.destroy())

function setup(markdown: string, cursorText: string) {
  editor = createHeadlessEditor(markdown)
  let pos = 0
  editor.state.doc.descendants((node, p) => {
    if (node.isText && node.text === cursorText) pos = p + 1
  })
  editor.commands.setTextSelection(pos)
  return editor
}
const markdown = () => toStoredBody(editor!.getMarkdown())

describe('block actions', () => {
  it('finds the top-level block at the cursor', () => {
    const e = setup('one\n\n- two', 'two')
    expect(e.state.doc.nodeAt(blockPosAtCursor(e)!)!.type.name).toBe('bulletList')
  })

  it('turns a block into a heading from any cursor position', () => {
    const e = setup('one\n\ntwo', 'one')
    const second = e.state.doc.child(0).nodeSize
    expect(runBlockAction(e, handlers, action('heading-2'), second)).toBe(true)
    expect(markdown()).toBe('one\n\n## two\n')
  })

  it('moves, duplicates and deletes blocks', () => {
    const e = setup('one\n\ntwo', 'two')
    runBlockAction(e, handlers, action('move-up'), blockPosAtCursor(e)!)
    expect(markdown()).toBe('two\n\none\n')
    runBlockAction(e, handlers, action('duplicate'), 0)
    expect(markdown()).toBe('two\n\ntwo\n\none\n')
    runBlockAction(e, handlers, action('delete'), 0)
    expect(markdown()).toBe('two\n\none\n')
  })

  it('reports actions that cannot run', () => {
    const e = setup('only', 'only')
    expect(canRunBlockAction(e, handlers, action('move-up'), 0)).toBe(false)
    expect(canRunBlockAction(e, handlers, action('delete'), 999)).toBe(false)
  })
})
