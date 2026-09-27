import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { createNode, moveNode, renameNode, trashNode } from './manuscript'
import { getStructure } from './structure'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

type Titles = [string, [string, string[]][]][]
const titles = async (): Promise<Titles> => (await getStructure(book.db)).map(p => [p.title, p.children.map(c => [c.title, c.children.map(s => s.title)] as [string, string[]])])

describe('manuscript service', () => {
  it('creates parts, chapters and scenes at the end of their parent', async () => {
    const part = await createNode(book, { type: 'part', title: 'Part Two' })
    const chapter = await createNode(book, { type: 'chapter', title: 'Storm', parentId: part.id })
    await createNode(book, { type: 'scene', title: 'Landfall', parentId: chapter.id })
    expect(await titles()).toEqual([
      ['Part One', [['The Harbor', ['Arrival', 'The Map']], ['The Drowned Guild', ['The Meeting']]]],
      ['Part Two', [['Storm', ['Landfall']]]],
    ])
  })

  it('rejects scenes without a chapter parent', async () => {
    await expect(createNode(book, { type: 'scene', title: 'x' })).rejects.toThrow(/needs a parent chapter/)
    await expect(createNode(book, { type: 'scene', title: 'x', parentId: 'prt_part0ne001' })).rejects.toThrow(/must be a chapter/)
  })

  it('reorders scenes within a chapter and persists it to disk', async () => {
    await moveNode(book, 'scn_themap0001', { index: 0 })
    expect((await titles())[0]![1]![0]).toEqual(['The Harbor', ['The Map', 'Arrival']])
    expect(await readdir(join(book.root, 'manuscript/01-part-one/01-the-harbor'))).toEqual(['01-the-map.md', '02-arrival.md', 'index.md'])
  })

  it('moves a scene into another chapter at a position', async () => {
    await moveNode(book, 'scn_arr1val001', { parentId: 'chp_gu1ld00001', index: 0 })
    expect((await titles())[0]![1]).toEqual([['The Harbor', ['The Map']], ['The Drowned Guild', ['Arrival', 'The Meeting']]])
  })

  it('renames by title without changing ids or files', async () => {
    await renameNode(book, 'scn_themap0001', 'Father\'s Map')
    const [part] = await getStructure(book.db)
    expect(part!.children[0]!.children[0]).toMatchObject({ id: 'scn_themap0001', title: 'Father\'s Map', path: 'manuscript/01-part-one/01-the-harbor/01-the-map.md' })
  })

  it('trashes a chapter with its scenes', async () => {
    await trashNode(book, 'chp_harb0r0001')
    expect((await titles())[0]![1].map(c => c[0])).toEqual(['The Drowned Guild'])
  })
})
