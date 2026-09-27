import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import type { SuggestionView } from '#shared/schemas/suggestion'
import { setSuggestions } from '~/editor/extensions/ai-suggestions'
import { createHeadlessEditor } from '../../test/utils/headless-editor'
import { useSuggestions } from './useSuggestions'

const author = { kind: 'assistant' as const, name: 'Assistant' }
const make = (id: string, find: string, replace: string, kind: 'replace' | 'insert' = 'replace'): SuggestionView =>
  ({ id, entryId: 'scn_1', kind, find, replace, before: '', after: '', author, status: 'pending', createdAt: '2026-09-27T00:00:00.000Z', stale: false })
let pending: SuggestionView[] = []
const resolved: unknown[] = []
registerEndpoint('/api/books/demo/suggestions', () => pending)
registerEndpoint('/api/books/demo/suggestions/resolve', {
  method: 'POST',
  async handler(event) {
    const body = await readBody<{ ids: string[] }>(event)
    resolved.push(body)
    pending = pending.filter(s => !body.ids.includes(s.id))
    return []
  },
})

const scene: EntryDocument = { id: 'scn_1', path: 'manuscript/a.md', type: 'scene', title: 'A', body: '', hash: 'h', frontmatter: {} }
let editor: ReturnType<typeof createHeadlessEditor>
afterEach(() => editor?.destroy())

let entryCounter = 0

async function mountWithEditor(markdown: string) {
  editor = createHeadlessEditor(markdown)
  let api!: ReturnType<typeof useSuggestions>
  await mountSuspended(defineComponent({
    setup() {
      api = useSuggestions('demo', ref({ ...scene, id: `scn_test${entryCounter++}` }))
      return () => h('div')
    },
  }))
  const context = api.context
  context.attach(editor)
  await vi.waitFor(() => expect(api.suggestions.value).toHaveLength(pending.length))
  editor.view.dispatch(setSuggestions(editor.state, api.suggestions.value))
  return { api, context }
}

describe('useSuggestions', () => {
  it('accepts from the inline control: applies the text in the editor, then records it', async () => {
    pending = [make('sug_a000000001', 'tired creases', 'old creases')]
    const { api, context } = await mountWithEditor('The same tired creases.\n')
    context.onAction({ id: 'sug_a000000001', action: 'accept' })
    await vi.waitFor(() => expect(api.suggestions.value).toEqual([]))
    expect(editor.getMarkdown()).toBe('The same old creases.')
    expect(resolved.at(-1)).toEqual({ ids: ['sug_a000000001'], status: 'accepted' })
  })

  it('accepts an edited proposal and rejects without touching the text', async () => {
    pending = [make('sug_b000000001', 'tired', 'weary'), make('sug_c000000001', 'creases', 'folds')]
    const { api, context } = await mountWithEditor('The same tired creases.\n')
    context.onAction({ id: 'sug_b000000001', action: 'edit' })
    expect(api.panelOpen.value).toBe(true)
    expect(api.draft.value).toBe('weary')
    await api.accept('sug_b000000001', 'worn')
    expect(resolved.at(-1)).toEqual({ ids: ['sug_b000000001'], status: 'accepted', text: 'worn' })
    await api.reject('sug_c000000001')
    expect(editor.getMarkdown()).toBe('The same worn creases.')
    expect(resolved.at(-1)).toEqual({ ids: ['sug_c000000001'], status: 'rejected' })
  })

  it('accepts all suggestions that still fit, back to front', async () => {
    pending = [make('sug_d000000001', 'First', 'One'), make('sug_e000000001', 'second', 'two'), make('sug_f000000001', 'vanished', 'x')]
    const { api } = await mountWithEditor('First line and second line.\n')
    await api.acceptAll()
    expect(editor.getMarkdown()).toBe('One line and two line.')
    expect(resolved.at(-1)).toEqual({ ids: ['sug_e000000001', 'sug_d000000001'], status: 'accepted' })
    expect(api.suggestions.value.map(s => s.id)).toEqual(['sug_f000000001'])
  })

  it('does not apply a stale suggestion', async () => {
    pending = [make('sug_g000000001', 'gone', 'x')]
    const { api } = await mountWithEditor('Nothing here.\n')
    await api.accept('sug_g000000001')
    expect(editor.getMarkdown()).toBe('Nothing here.')
    expect(api.suggestions.value).toHaveLength(1)
  })
})
