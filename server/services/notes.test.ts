import { access } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { updateDocumentMeta } from './documents'
import { captureNote, fileNote, listNotes, noteCounts } from './notes'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
const titles = async (query: Parameters<typeof listNotes>[1]) => (await listNotes(book, query)).map(note => note.title)

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

describe('notes service', () => {
  it('lists notes pinned first with inbox flag, tags and excerpt', async () => {
    const notes = await listNotes(book, { filter: 'all' })
    expect(notes.map(n => n.title)).toEqual(['Thoughts about the ending', 'Idea – the lighthouse'])
    expect(notes[1]).toMatchObject({ inbox: true, tags: ['idea'], pinned: false, excerpt: 'What if the lighthouse keeper drew the first map?' })
  })

  it('combines filter, tag and search', async () => {
    expect(await titles({ filter: 'inbox' })).toEqual(['Idea – the lighthouse'])
    expect(await titles({ filter: 'pinned' })).toEqual(['Thoughts about the ending'])
    expect(await titles({ filter: 'all', tag: 'idea' })).toEqual(['Idea – the lighthouse'])
    expect(await titles({ filter: 'all', q: 'sea' })).toEqual(['Thoughts about the ending'])
    expect(await titles({ filter: 'inbox', q: 'sea' })).toEqual([])
    expect(await titles({ filter: 'all', q: '!!!' })).toEqual([])
  })

  it('counts notes per filter and tag', async () => {
    expect(await noteCounts(book)).toEqual({ all: 2, inbox: 1, pinned: 1, tags: [{ tag: 'idea', count: 1 }] })
  })

  it('captures into the inbox and files notes out of it', async () => {
    const { path } = await captureNote(book, { text: 'Storm chapter\nMake it rain for three days.' })
    expect(path).toBe('notes/inbox/storm-chapter.md')
    expect(await titles({ filter: 'inbox' })).toContain('Storm chapter')

    const filed = await fileNote(book, path)
    expect(filed.path).toBe('notes/storm-chapter.md')
    await access(join(book.root, filed.path))
    expect(await titles({ filter: 'inbox' })).not.toContain('Storm chapter')
    await expect(fileNote(book, filed.path)).rejects.toMatchObject({ code: 'invalid_path' })
  })

  it('pins and tags notes through entry metadata', async () => {
    await updateDocumentMeta(book, { path: 'notes/storm-chapter.md', meta: { pinned: true, tags: ['weather'], title: 'Storm' } })
    expect((await listNotes(book, { filter: 'pinned' })).map(n => n.title)).toContain('Storm')
    expect(await titles({ filter: 'all', tag: 'weather' })).toEqual(['Storm'])
  })
})
