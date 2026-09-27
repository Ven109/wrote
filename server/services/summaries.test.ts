import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { applyChange } from '../db/indexer'
import { getSummary, listSummaries, saveManualSummary } from '../db/state/summaries'
import { refreshSummaries, type GenerateSummary } from './summaries'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
let prompts: string[]

const generate: GenerateSummary = async (prompt) => {
  prompts.push(prompt.prompt)
  const title = prompt.prompt.match(/"([^"]+)"/)?.[1]
  return { text: `Summary of ${title}.`, tokens: 100 }
}
const refresh = (options: Partial<Parameters<typeof refreshSummaries>[1]> = {}) =>
  refreshSummaries(book, { generate, model: 'ollama:fast', dailyTokenBudget: 1_000_000, signal: new AbortController().signal, ...options })
const scenePath = 'manuscript/01-part-one/02-the-drowned-guild/01-the-meeting.md'
// Index the change directly instead of waiting for the file watcher.
async function writeScene(body: string) {
  await writeFile(join(book.root, scenePath), `---\nid: scn_meet1ng001\ntitle: The Meeting\n---\n${body}\n`)
  await applyChange(book.db, book.repository, { kind: 'changed', path: scenePath })
}

beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
  prompts = []
})
afterEach(() => closeAllBooks())

describe('refreshSummaries', () => {
  it('summarizes every scene, then rolls up chapters, parts and the book', async () => {
    const result = await refresh()
    expect(result).toEqual({ scenes: 3, rollups: 4, tokens: 700, stoppedByBudget: false })
    const texts = Object.fromEntries((await listSummaries(book.state)).map(s => [s.entryId, [s.scope, s.text]]))
    expect(texts.scn_meet1ng001).toEqual(['scene', 'Summary of The Meeting.'])
    expect(Object.values(texts).map(([scope]) => scope).sort()).toEqual(['book', 'chapter', 'chapter', 'part', 'scene', 'scene', 'scene'])
    // Rollups see their children's summaries in reading order, never the raw text.
    const chapter = prompts.find(p => p.includes('chapter "The Harbor"'))!
    expect(chapter.indexOf('Summary of Arrival.')).toBeLessThan(chapter.indexOf('Summary of The Map.'))
    expect(chapter).not.toContain('The tide was out')
  })

  it('does nothing when nothing changed, and ignores minor edits', async () => {
    await refresh()
    prompts = []
    expect(await refresh()).toMatchObject({ scenes: 0, rollups: 0, tokens: 0 })
    await writeScene('Nobody at the Lantern would look her in the eyes.')
    expect(await refresh()).toMatchObject({ scenes: 0, rollups: 0 })
    expect(prompts).toEqual([])
  })

  it('redoes a significantly changed scene and cascades to its chapter, part and book only', async () => {
    await refresh()
    prompts = []
    await writeScene('The guild master greeted her warmly, poured two cups of tea by the fire and told her the map was a forgery.')
    expect(await refresh({ generate: async p => ({ ...(await generate(p, new AbortController().signal)), text: p.prompt.includes('<scene>') ? 'Mara learns the map is forged.' : 'Rolled up.' }) }))
      .toEqual({ scenes: 1, rollups: 3, tokens: 400, stoppedByBudget: false })
    expect(prompts[0]).toContain('the map was a forgery')
    expect((await getSummary(book.state, 'scn_meet1ng001'))?.text).toBe('Mara learns the map is forged.')
    expect((await getSummary(book.state, 'scn_arr1val001'))?.text).toBe('Summary of Arrival.')
  })

  it('never overwrites manual summaries, but uses them in rollups', async () => {
    await saveManualSummary(book.state, { entryId: 'scn_meet1ng001', scope: 'scene', text: 'My own words.' }, new Date())
    await refresh()
    expect((await getSummary(book.state, 'scn_meet1ng001'))).toMatchObject({ text: 'My own words.', isManual: true })
    expect(prompts.some(p => p.includes('Nobody at the Lantern'))).toBe(false)
    expect(prompts.find(p => p.includes('chapter "The Drowned Guild"'))).toContain('My own words.')
  })

  it('stops at the daily token budget and continues on a later run', async () => {
    expect(await refresh({ dailyTokenBudget: 250 })).toMatchObject({ scenes: 3, rollups: 0, tokens: 300, stoppedByBudget: true })
    const tomorrow = () => new Date(Date.now() + 86_400_000)
    expect(await refresh({ dailyTokenBudget: 250, now: tomorrow })).toMatchObject({ scenes: 0, rollups: 3, stoppedByBudget: true })
  })

  it('prunes summaries of deleted scenes', async () => {
    await refresh()
    await rm(join(book.root, scenePath))
    await applyChange(book.db, book.repository, { kind: 'removed', path: scenePath })
    await refresh()
    expect(await getSummary(book.state, 'scn_meet1ng001')).toBeNull()
  })
})
