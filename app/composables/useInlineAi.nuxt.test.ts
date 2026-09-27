import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody, setResponseStatus } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { inlineRequestFor, useInlineAi } from './useInlineAi'

const requests: Record<string, unknown>[] = []
let fail = false
registerEndpoint('/api/books/demo/ai/inline', {
  method: 'POST',
  async handler(event) {
    requests.push(await readBody(event))
    if (fail) {
      setResponseStatus(event, 409)
      return { statusMessage: 'No AI model is configured', data: { code: 'ai_not_configured' } }
    }
    return 'The keeper trimmed the last wick.'
  },
})

const doc: EntryDocument = { id: 'scn_1', path: 'manuscript/a.md', type: 'scene', title: 'A', body: '', hash: 'h', frontmatter: {} }
let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => {
  editor?.destroy()
  fail = false
})

async function mountAi() {
  const beforeRun = vi.fn(async () => {})
  let ai!: ReturnType<typeof useInlineAi>
  await mountSuspended(defineComponent({
    setup() {
      ai = useInlineAi('demo', ref(doc), beforeRun)
      return () => h('div')
    },
  }))
  return { ai, beforeRun }
}

describe('useInlineAi', () => {
  it('derives the passage and mode: selection or block, "continue" adds after', () => {
    editor = createHeadlessEditor('The keeper **trimmed** the wick.\n\nNext.')
    editor.commands.setTextSelection({ from: 5, to: 19 })
    expect(inlineRequestFor(editor, 'rephrase', { kind: 'selection' })).toEqual({ find: 'keeper **trimmed**', mode: 'replace' })
    expect(inlineRequestFor(editor, 'continue', { kind: 'block', pos: 0 })).toEqual({ find: 'The keeper **trimmed** the wick.', mode: 'insert' })
  })

  it('continues from the paragraph above an empty line', () => {
    editor = createHeadlessEditor('The keeper trimmed the wick.')
    editor.commands.setTextSelection(editor.state.doc.content.size - 1)
    editor.commands.splitBlock()
    const empty = editor.state.doc.child(0).nodeSize
    expect(inlineRequestFor(editor, 'continue', { kind: 'block', pos: empty })).toEqual({ find: 'The keeper trimmed the wick.', mode: 'insert' })
    expect(inlineRequestFor(editor, 'rephrase', { kind: 'block', pos: empty }).find).toBe('')
  })

  it('saves first, streams a preview and asks the server for a suggestion', async () => {
    editor = createHeadlessEditor('The keeper trimmed the wick.')
    const { ai, beforeRun } = await mountAi()
    ai.context.run(editor, 'tone', { kind: 'block', pos: 0 }, 'darker')
    await vi.waitFor(() => expect(ai.running.value).toBeNull())
    expect(beforeRun).toHaveBeenCalled()
    expect(ai.preview.value).toBe('The keeper trimmed the last wick.')
    expect(requests.at(-1)).toEqual({ entryPath: 'manuscript/a.md', action: 'tone', find: 'The keeper trimmed the wick.', mode: 'replace', param: 'darker' })
    expect(editor.getMarkdown()).toBe('The keeper trimmed the wick.')
  })

  it('asks for the instruction of a custom action', async () => {
    editor = createHeadlessEditor('The keeper trimmed the wick.')
    const { ai } = await mountAi()
    ai.context.ask(editor, { kind: 'block', pos: 0 })
    expect(ai.asking.value).toBe(true)
    ai.prompt.value = 'Make it eerie'
    ai.submitPrompt()
    expect(ai.asking.value).toBe(false)
    await vi.waitFor(() => expect(requests.at(-1)).toMatchObject({ action: 'custom', param: 'Make it eerie' }))
  })

  it('does nothing without a passage and reports server errors', async () => {
    editor = createHeadlessEditor('')
    const { ai } = await mountAi()
    const count = requests.length
    ai.context.run(editor, 'rephrase', { kind: 'selection' })
    expect(requests.length).toBe(count)
    editor.destroy()
    editor = createHeadlessEditor('Some text.')
    fail = true
    ai.context.run(editor, 'rephrase', { kind: 'block', pos: 0 })
    await vi.waitFor(() => expect(requests.length).toBe(count + 1))
    await vi.waitFor(() => expect(ai.running.value).toBeNull())
    expect(ai.preview.value).toBe('')
  })
})
