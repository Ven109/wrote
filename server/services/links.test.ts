import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { updateDocumentMeta } from './documents'
import { backlinksWithContext, listLinkables, resolveTargets } from './links'
import { renameNode } from './manuscript'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

describe('links service', () => {
  it('resolves by title, id and alias, case-insensitively', async () => {
    const resolved = await resolveTargets(book, ['hollow bay', 'cdx_h0llowbay1', 'Nowhere'])
    expect(resolved['hollow bay']).toMatchObject({ id: 'cdx_h0llowbay1', type: 'codex' })
    expect(resolved.cdx_h0llowbay1?.title).toBe('Hollow Bay')
    expect(resolved.Nowhere).toBeNull()
    expect(await resolveTargets(book, [])).toEqual({})
  })

  it('lists linkable entries', async () => {
    const titles = (await listLinkables(book)).map(ref => ref.title)
    expect(titles).toEqual(expect.arrayContaining(['Arrival', 'Hollow Bay', 'Thoughts about the ending']))
    expect(titles).not.toContain('Style guide')
  })

  it('returns backlinks with context', async () => {
    const links = await backlinksWithContext(book, 'cdx_h0llowbay1')
    const arrival = links.find(link => link.title === 'Arrival')!
    expect(arrival.context).toContain('[[Hollow Bay]]')
  })

  it('rewrites links when a codex entry is renamed via metadata', async () => {
    const result = await updateDocumentMeta(book, { path: 'codex/places/hollow-bay.md', meta: { title: 'Hollow Harbor' } })
    expect(result.updatedLinks.map(ref => ref.title).sort()).toEqual(['Arrival', 'Mara Velden'])
    const arrival = await readFile(join(book.root, 'manuscript/01-part-one/01-the-harbor/01-arrival.md'), 'utf8')
    expect(arrival).toContain('[[Hollow Harbor]]')
    expect((await backlinksWithContext(book, 'cdx_h0llowbay1')).map(link => link.title).sort()).toEqual(['Arrival', 'Mara Velden'])
  })

  it('rewrites links when a scene is renamed in the tree, and undo restores them', async () => {
    await updateDocumentMeta(book, { path: 'notes/ending.md', meta: {} })
    const { updatedLinks } = await renameNode(book, 'scn_arr1val001', 'Landfall')
    expect(updatedLinks).toEqual([])
    const renamed = await updateDocumentMeta(book, { path: 'codex/characters/mara-velden.md', meta: { title: 'Mara V.' } })
    expect(renamed.updatedLinks.map(ref => ref.title)).toEqual(['Thoughts about the ending'])
    const undo = await updateDocumentMeta(book, { path: 'codex/characters/mara-velden.md', meta: { title: 'Mara Velden' } })
    expect(undo.updatedLinks.map(ref => ref.title)).toEqual(['Thoughts about the ending'])
    expect(await readFile(join(book.root, 'notes/ending.md'), 'utf8')).toContain('[[Mara Velden]]')
  })
})
