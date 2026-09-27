import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { updateCodexEntry } from './codex'
import { saveDocumentBody } from './documents'
import { appearsIn, mentionTargets } from './mentions'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
const ARRIVAL = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

describe('mentions', () => {
  it('lists detection targets with names, aliases and facts', async () => {
    const targets = await mentionTargets(book)
    const mara = targets.find(target => target.id === 'cdx_mara000001')!
    expect(mara.names).toEqual(['Mara Velden', 'The Cartographer'])
    expect(mara.facts).toEqual([{ label: 'Role', value: 'protagonist' }])
  })

  it('honours the per-entry opt-out (detect: false)', async () => {
    const path = 'codex/places/hollow-bay.md'
    const entry = await book.repository.read(path)
    await book.repository.write(path, { frontmatter: { ...entry.frontmatter, detect: false }, body: entry.body }, entry.hash)
    const { applyChange } = await import('../db/indexer')
    await applyChange(book.db, book.repository, { kind: 'changed', path })
    expect((await mentionTargets(book)).map(target => target.title)).not.toContain('Hollow Bay')
  })

  it('lists scenes mentioning an entry by title or alias, updated after edits', async () => {
    expect(await appearsIn(book, 'cdx_mara000001')).toEqual([])
    const doc = await book.repository.read(ARRIVAL)
    await saveDocumentBody(book, { path: ARRIVAL, body: 'Mara Velden looked at the sea. The Cartographer sighed.\n', expectedHash: doc.hash })
    expect(await appearsIn(book, 'cdx_mara000001')).toEqual([{ id: 'scn_arr1val001', path: ARRIVAL, title: 'Arrival', count: 2 }])
    await updateCodexEntry(book, { path: 'codex/characters/mara-velden.md', fields: {}, aliases: [] })
    expect((await appearsIn(book, 'cdx_mara000001'))[0]?.count).toBe(1)
  })
})
