import { MockLanguageModelV4 } from 'ai/test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scriptedModel } from '../../test/utils/mock-model'
import { createTestWorkspace } from '../../test/utils/workspace'
import { getContextSnapshot } from '../db/state/context-snapshots'
import { completeText, streamInlineAction } from './inline-ai'
import { listSuggestions } from './suggestions'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
const map = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'

beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

describe('inline AI actions', () => {
  it('streams the result and turns it into a pending suggestion – the entry stays unchanged', async () => {
    const model = scriptedModel([{ text: 'folded along the same worn lines' }])
    const response = await streamInlineAction(book, { entryPath: map, action: 'rephrase', find: 'folded along the same tired creases', mode: 'replace' }, { model, ref: 'ollama:tiny' })
    expect(await response.text()).toBe('folded along the same worn lines')
    await expect.poll(async () => (await listSuggestions(book, { entryId: 'scn_themap0001' })).length).toBe(1)
    const [suggestion] = await listSuggestions(book, { entryId: 'scn_themap0001' })
    expect(suggestion).toMatchObject({ kind: 'replace', find: 'folded along the same tired creases', replace: 'folded along the same worn lines', rationale: 'Rephrase', author: { kind: 'assistant', name: 'AI · Rephrase' } })
    expect((await book.repository.read(map)).body).toContain('tired creases')
  })

  it('builds the prompt with the context engine and stores the snapshot', async () => {
    const model = scriptedModel([{ text: 'x' }])
    const response = await streamInlineAction(book, { entryPath: map, action: 'tone', param: 'darker', find: 'tired creases', mode: 'replace' }, { model, ref: 'ollama:tiny' })
    await response.text()
    const snapshot = await getContextSnapshot(book.state, response.headers.get('x-context-snapshot')!)
    expect(snapshot).toMatchObject({ feature: 'inline:tone', model: 'ollama:tiny' })
    expect(snapshot!.system).toContain('darker tone')
    expect(snapshot!.items.map(item => item.id)).toContain('selection')
    expect(JSON.stringify(model.prompts[0])).toContain(JSON.stringify(snapshot!.system).slice(1, 60))
  })

  it('adds "continue" as a block after the paragraph and labels custom prompts', async () => {
    const model = scriptedModel([{ text: 'She closed the drawer.' }])
    await (await streamInlineAction(book, { entryPath: map, action: 'custom', param: 'make it about the sea', find: 'tired creases', mode: 'insert' }, { model, ref: 'ollama:tiny' })).text()
    await expect.poll(async () => (await listSuggestions(book, { entryId: 'scn_themap0001' }))[0]?.kind).toBe('insert')
    expect((await listSuggestions(book, { entryId: 'scn_themap0001' }))[0]!.rationale).toBe('Ask AI: make it about the sea')
  })

  it('refuses passages that are not (uniquely) in the saved text', async () => {
    const model = scriptedModel([{ text: 'x' }])
    await expect(streamInlineAction(book, { entryPath: map, action: 'rephrase', find: 'not there', mode: 'replace' }, { model, ref: 'ollama:tiny' })).rejects.toMatchObject({ code: 'invalid_input' })
    expect(model.prompts).toEqual([])
  })
})

describe('autocomplete', () => {
  it('returns a short single-line continuation', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({
        content: [{ type: 'text', text: ' along the same lines.\nAnd more.' }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } },
        warnings: [],
      }),
    })
    expect(await completeText(book, { entryPath: map, before: 'The map was folded' }, { model, ref: 'ollama:tiny' })).toBe(' along the same lines.')
  })
})
