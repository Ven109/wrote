import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { searchEntries } from '../db/queries'
import { readDocument, saveDocumentBody } from './documents'
import { closeAllBooks, openBook, type BookContext } from './workspace'

const PATH = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
let book: BookContext

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

describe('documents service', () => {
  it('reads an entry as a document', async () => {
    const doc = await readDocument(book, PATH)
    expect(doc).toMatchObject({ id: 'scn_arr1val001', type: 'scene', title: 'Arrival', path: PATH })
    expect(doc.body).toContain('[[Hollow Bay]]')
    expect(doc.hash).toMatch(/\w+/)
  })

  it('saves the body, keeps frontmatter, bumps updated and reindexes', async () => {
    const before = await readDocument(book, PATH)
    const saved = await saveDocumentBody(book, { path: PATH, body: 'Driftwood everywhere.\n', expectedHash: before.hash }, new Date('2026-01-02T03:04:05.000Z'))
    expect(saved.hash).not.toBe(before.hash)
    const source = await readFile(join(book.root, PATH), 'utf8')
    expect(source).toContain('id: scn_arr1val001')
    expect(source).toContain('updated: 2026-01-02T03:04:05.000Z')
    expect(source.endsWith('---\nDriftwood everywhere.\n')).toBe(true)
    const hits = await searchEntries(book.db, 'driftwood')
    expect(hits.map(hit => hit.id)).toContain('scn_arr1val001')
  })

  it('does not rewrite unchanged bodies', async () => {
    const current = await readDocument(book, PATH)
    const saved = await saveDocumentBody(book, { path: PATH, body: current.body, expectedHash: current.hash })
    expect(saved.hash).toBe(current.hash)
  })

  it('rejects stale hashes with a conflict', async () => {
    await expect(saveDocumentBody(book, { path: PATH, body: 'x', expectedHash: 'stale' })).rejects.toMatchObject({ code: 'conflict' })
  })

  it('rejects unknown and escaping paths', async () => {
    await expect(readDocument(book, 'manuscript/nope.md')).rejects.toMatchObject({ code: 'not_found' })
    await expect(readDocument(book, '../../etc/passwd.md')).rejects.toMatchObject({ code: 'invalid_path' })
  })
})
