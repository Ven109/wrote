import { cp, mkdir, readdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FIXTURE_BOOK } from '../../test/utils/fixture-book'
import { createBook, listBooks, openFolderAsBook, removeBook, updateBook } from './books'
import { closeAllBooks, listBookLocations } from './workspace'
import { createTempDir } from '../../test/utils/workspace'

describe('book service', () => {
  let workspace: string
  let outside: string

  beforeEach(async () => {
    workspace = await createTempDir('wrote-ws-')
    outside = await createTempDir('wrote-ext-')
  })
  afterEach(async () => {
    await closeAllBooks()
    await rm(workspace, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  })

  it('creates a novel from the template with a first scene', async () => {
    const { book, firstScenePath } = await createBook(workspace, { title: 'The Long Tide', author: 'A. Writer' })
    expect(book).toMatchObject({ id: 'the-long-tide', title: 'The Long Tide', template: 'novel', scenes: 1, external: false })
    expect(firstScenePath).toBe('manuscript/01-part-one/01-chapter-one/01-opening.md')
    const root = join(workspace, 'the-long-tide')
    expect((await readdir(root)).sort()).toEqual(['.wrote', 'codex', 'manuscript', 'notes', 'outline.md', 'research', 'style-guide.md', 'wrote.json'])
  })

  it('creates unique ids for duplicate titles', async () => {
    await createBook(workspace, { title: 'Twin', template: 'blank' })
    const { book } = await createBook(workspace, { title: 'Twin', template: 'blank' })
    expect(book.id).toBe('twin-2')
  })

  it('opens an external folder, adding wrote.json without touching files', async () => {
    const folder = join(outside, 'My Draft')
    await mkdir(join(folder, 'notes'), { recursive: true })
    const book = await openFolderAsBook(workspace, folder)
    expect(book).toMatchObject({ id: 'my-draft', title: 'My Draft', external: true })
    expect(JSON.parse(await readFile(join(folder, 'wrote.json'), 'utf8')).title).toBe('My Draft')
    expect(await openFolderAsBook(workspace, folder)).toMatchObject({ id: 'my-draft' })
  })

  it('rejects relative or missing folders', async () => {
    await expect(openFolderAsBook(workspace, 'relative/path')).rejects.toThrow(/Invalid path/)
    await expect(openFolderAsBook(workspace, join(outside, 'missing'))).rejects.toThrow(/not found/)
  })

  it('lists books and updates settings', async () => {
    await cp(FIXTURE_BOOK, join(workspace, 'sample-book'), { recursive: true })
    await createBook(workspace, { title: 'Second' })
    expect((await listBooks(workspace)).map(b => b.id).sort()).toEqual(['sample-book', 'second'])
    const updated = await updateBook(workspace, 'sample-book', { subtitle: 'A novel' })
    expect(updated).toMatchObject({ subtitle: 'A novel', title: 'The Cartographer of Hollow Bay' })
  })

  it('removes books without deleting files', async () => {
    await createBook(workspace, { title: 'Gone' })
    await removeBook(workspace, 'gone')
    expect(await listBookLocations(workspace)).toEqual([])
    expect((await readdir(join(workspace, '.trash')))[0]).toMatch(/^gone-\d+$/)

    const folder = join(outside, 'ext')
    await mkdir(folder)
    await openFolderAsBook(workspace, folder)
    await removeBook(workspace, 'ext')
    expect(await listBookLocations(workspace)).toEqual([])
    expect(await readdir(folder)).toContain('wrote.json')
  })
})
