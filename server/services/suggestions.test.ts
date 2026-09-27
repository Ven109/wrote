import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { applyChange } from '../db/indexer'
import { findSuggestions } from '../db/state/suggestions'
import { subscribeSuggestionEvents } from '../utils/book-events'
import { createSuggestion, importLegacySuggestions, listSuggestions, resolveSuggestions } from './suggestions'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
const author = { kind: 'mcp' as const, name: 'Claude Desktop' }
const map = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'

async function rewriteMap(body: string) {
  await writeFile(join(book.root, map), `---\nid: scn_themap0001\ntitle: The Map\n---\n${body}\n`)
  await applyChange(book.db, book.repository, { kind: 'changed', path: map })
}

beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

describe('suggestions', () => {
  it('stores a pending suggestion with its surroundings, without touching the entry, and announces it', async () => {
    const events: string[] = []
    const unsubscribe = subscribeSuggestionEvents(book.id, event => events.push(event.entryId))
    const writes: string[] = []
    book.repository.onWrite(path => writes.push(path))
    const suggestion = await createSuggestion(book, { entryId: 'scn_themap0001', find: 'tired creases', replace: 'old creases', rationale: 'Less cliché', author })
    unsubscribe()
    expect(suggestion).toMatchObject({ kind: 'replace', status: 'pending', before: ' was still in the drawer, folded along the same ', after: '.\n' })
    expect(writes).toEqual([])
    expect(events).toEqual(['scn_themap0001'])
    expect(await listSuggestions(book, { entryId: 'scn_themap0001' })).toEqual([{ ...suggestion, stale: false }])
  })

  it('rejects anchors that are missing or ambiguous, and unknown entries', async () => {
    await expect(createSuggestion(book, { entryId: 'scn_themap0001', find: 'nowhere', replace: 'x', author })).rejects.toMatchObject({ code: 'invalid_input' })
    await expect(createSuggestion(book, { entryId: 'scn_themap0001', find: 'the', replace: 'x', author })).rejects.toThrow(/more than once/)
    await expect(createSuggestion(book, { entryId: 'scn_missing001', find: 'x', replace: 'y', author })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('keeps suggestions anchored through nearby edits and flags them stale when their text is gone', async () => {
    const suggestion = await createSuggestion(book, { entryId: 'scn_themap0001', find: 'tired creases', replace: 'old creases', author })
    await rewriteMap('A new opening line.\n\nHer father\'s map was still in the drawer, folded along the same tired creases. The drawer stuck.')
    expect((await listSuggestions(book, { entryId: 'scn_themap0001' }))[0]).toMatchObject({ id: suggestion.id, stale: false })
    await rewriteMap('Her father\'s map was gone.')
    expect((await listSuggestions(book, { entryId: 'scn_themap0001' }))[0]).toMatchObject({ id: suggestion.id, stale: true, status: 'pending' })
  })

  it('records accept (with the author\'s edit) and reject decisions, once', async () => {
    const a = await createSuggestion(book, { entryId: 'scn_themap0001', find: 'tired creases', replace: 'old creases', author })
    const b = await createSuggestion(book, { entryId: 'scn_themap0001', kind: 'insert', find: 'in the drawer', replace: 'She did not touch it.', author })
    const [accepted] = await resolveSuggestions(book, { ids: [a.id], status: 'accepted', text: 'worn creases' })
    expect(accepted).toMatchObject({ status: 'accepted', appliedText: 'worn creases' })
    expect((await resolveSuggestions(book, { ids: [b.id], status: 'rejected' }))[0]!.status).toBe('rejected')
    await expect(resolveSuggestions(book, { ids: [a.id], status: 'rejected' })).rejects.toThrow(/already resolved/)
    await expect(resolveSuggestions(book, { ids: ['sug_missing000'], status: 'rejected' })).rejects.toMatchObject({ code: 'not_found' })
    expect(await listSuggestions(book, { entryId: 'scn_themap0001', status: 'pending' })).toEqual([])
  })

  it('moves suggestions from the old JSON files into state.db', async () => {
    const dir = join(book.root, '.wrote/suggestions')
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'sug_legacy0001.json'), JSON.stringify({ id: 'sug_legacy0001', entryId: 'scn_themap0001', find: 'tired creases', replace: 'x', author, status: 'pending', createdAt: '2026-09-01T00:00:00.000Z' }))
    expect(await importLegacySuggestions(book)).toBe(1)
    expect(await findSuggestions(book.state)).toEqual([expect.objectContaining({ id: 'sug_legacy0001', kind: 'replace', before: '' })])
    expect(await importLegacySuggestions(book)).toBe(0)
  })
})
