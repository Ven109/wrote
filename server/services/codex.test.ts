import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { saveCustomType } from '../codex/types'
import { createCodexEntry, listCodex, updateCodexEntry } from './codex'
import { readDocument } from './documents'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
const MARA = 'codex/characters/mara-velden.md'

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

const titles = async (query: Parameters<typeof listCodex>[1]) => (await listCodex(book, query)).map(entry => entry.title)

describe('codex service', () => {
  it('lists entries with type, aliases and excerpt, filtered by type, tag and name/alias', async () => {
    expect(await titles({})).toEqual(['Hollow Bay', 'Mara Velden'])
    expect((await listCodex(book, { type: 'character' }))[0]).toMatchObject({ title: 'Mara Velden', codexType: 'character', aliases: ['The Cartographer'] })
    expect(await titles({ q: 'the cart' })).toEqual(['Mara Velden'])
    expect(await titles({ q: 'cartog' })).toEqual(['Mara Velden'])
    expect(await titles({ q: '%' })).toEqual([])
    expect(await titles({ q: 'fishing' })).toEqual(['Hollow Bay'])
    expect(await titles({ type: 'place', q: 'mara' })).toEqual([])
  })

  it('round-trips custom and unknown frontmatter fields byte-for-byte', async () => {
    const before = await readFile(join(book.root, MARA), 'utf8')
    await updateCodexEntry(book, { path: MARA, fields: { role: 'protagonist' } })
    const after = await readFile(join(book.root, MARA), 'utf8')
    expect(after.replace(/\nupdated: .*\n/, '\n')).toBe(before)
    expect(after).toContain('eyes: grey')
  })

  it('updates template fields and aliases, removes cleared fields, validates', async () => {
    const doc = await updateCodexEntry(book, { path: MARA, fields: { age: '31', relationships: ['cdx_h0llowbay1'], role: null }, aliases: ['The Cartographer', 'Mar'] })
    expect(doc.frontmatter).toMatchObject({ age: '31', relationships: ['cdx_h0llowbay1'], aliases: ['The Cartographer', 'Mar'], eyes: 'grey' })
    expect(doc.frontmatter).not.toHaveProperty('role')
    expect(await titles({ q: 'mar' })).toEqual(['Mara Velden'])
    await expect(updateCodexEntry(book, { path: MARA, fields: { role: 'hero' } })).rejects.toMatchObject({ code: 'invalid_input' })
    await expect(updateCodexEntry(book, { path: 'notes/ending.md', fields: {} })).rejects.toMatchObject({ code: 'not_found' })
  })

  it('creates entries of built-in and custom types in their folders', async () => {
    const tide = await createCodexEntry(book, { type: 'lore', title: 'The Drowning' })
    expect(tide.path).toBe('codex/lore/the-drowning.md')
    await saveCustomType(book.root, { id: 'creature', label: 'Creature', plural: 'Creatures', icon: 'i-lucide-bug', folder: 'creatures', builtIn: false, fields: [{ key: 'habitat', label: 'Habitat', kind: 'text', required: false }] })
    const eel = await createCodexEntry(book, { type: 'creature', title: 'Deep Eel' })
    expect(eel.path).toBe('codex/creatures/deep-eel.md')
    await updateCodexEntry(book, { path: eel.path, fields: { habitat: 'The trench' } })
    expect((await readDocument(book, eel.path)).frontmatter).toMatchObject({ codexType: 'creature', habitat: 'The trench' })
    expect(await titles({ type: 'creature' })).toEqual(['Deep Eel'])
    await expect(createCodexEntry(book, { type: 'dragon', title: 'x' })).rejects.toMatchObject({ code: 'invalid_input' })
  })
})
