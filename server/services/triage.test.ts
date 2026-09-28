import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { applyChange } from '../db/indexer'
import { triageNote } from './triage'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

async function note(title: string, body: string, tags: string[] = [], dir = 'notes/inbox') {
  const entry = await book.repository.create({ type: 'note', dir, title, body, frontmatter: { tags } })
  await applyChange(book.db, book.repository, { kind: 'added', path: entry.path })
  return entry.path
}

describe('inbox triage', () => {
  it('suggests codex entries the note names, the chapter it belongs to and tags of similar notes', async () => {
    await note('Tide ideas', 'The tide and the map drawer.', ['plot', 'sea'], 'notes')
    await note('More tide', 'Low tide at the harbor.', ['plot'], 'notes')
    const path = await note('Mara and the tide', 'Mara Velden should notice the tide was out when she finds the map in the drawer.')
    const triage = await triageNote(book, path)
    expect(triage.links[0]).toMatchObject({ id: 'cdx_mara000001', title: 'Mara Velden', reason: 'mentioned' })
    expect(triage.chapter).toMatchObject({ id: 'chp_harb0r0001', title: 'The Harbor' })
    expect(triage.tags[0]).toBe('plot')
    expect(triage.tags).toContain('sea')
  })

  it('leaves out what the note already has', async () => {
    const path = await note('Linked', 'Mara at low tide on the harbor, map in the drawer. [[Mara Velden]] [[The Harbor]]', ['plot'])
    const triage = await triageNote(book, path)
    expect(triage.links.map(link => link.title)).not.toContain('Mara Velden')
    expect(triage.chapter).toBeNull()
    expect(triage.tags).not.toContain('plot')
  })

  it('only triages notes', async () => {
    await expect(triageNote(book, 'codex/characters/mara-velden.md')).rejects.toThrow('not a note')
  })
})
