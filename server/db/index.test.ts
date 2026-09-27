import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { createBookRepository, type BookRepository } from '../storage/repository'
import { openIndexDb, type IndexDb } from './client'
import { applyChange, syncIndex } from './indexer'
import { backlinks, outgoingLinks, searchEntries, toFtsQuery } from './queries'

describe('toFtsQuery', () => {
  it('quotes terms and prefixes the last one', () => {
    expect(toFtsQuery('Mara harb')).toBe('"mara" "harb"*')
  })

  it('neutralises FTS syntax', () => {
    expect(toFtsQuery('title:"x" OR (NEAR)')).toBe('"title" "x" "or" "near"*')
    expect(toFtsQuery('!!!')).toBeNull()
  })
})

describe('book index', () => {
  let root: string
  let cleanup: () => Promise<void>
  let repo: BookRepository
  let db: IndexDb

  beforeEach(async () => {
    ({ root, cleanup } = await copyFixtureBook())
    repo = createBookRepository(root)
    db = await openIndexDb(root)
    await syncIndex(db, repo)
  })
  afterEach(async () => {
    db.$client.close()
    await cleanup()
  })

  it('indexes every entry and skips unchanged files on resync', async () => {
    expect(await syncIndex(db, repo)).toEqual({ indexed: 0, unchanged: 13, removed: 0, errors: [] })
  })

  it('rebuilds a fresh index from the files', async () => {
    const fresh = await openIndexDb(':memory:')
    expect((await syncIndex(fresh, repo)).indexed).toBe(13)
    fresh.$client.close()
  })

  it('finds entries by body and title with snippets, title ranked first', async () => {
    const hits = await searchEntries(db, 'harbor')
    expect(hits[0]).toMatchObject({ title: 'The Harbor', type: 'chapter' })
    expect(hits.map(h => h.path)).toContain('manuscript/01-part-one/01-the-harbor/01-arrival.md')
    expect(hits.find(h => h.type === 'scene')?.snippet).toContain('<mark>harbor</mark>')
  })

  it('supports prefix, diacritics-insensitive and filtered search', async () => {
    expect((await searchEntries(db, 'lightho')).map(h => h.id)).toEqual(['nte_l1ghth0use'])
    expect(await searchEntries(db, 'harbor', { types: ['codex'] })).toHaveLength(1)
    expect(await searchEntries(db, 'harbor', { status: ['final'] })).toEqual([])
    expect((await searchEntries(db, 'lighthouse', { tags: ['idea'] })).length).toBe(1)
  })

  it('resolves backlinks by title and outgoing links', async () => {
    expect((await backlinks(db, 'cdx_h0llowbay1')).map(e => e.title).sort()).toEqual(['Arrival', 'Mara Velden'])
    expect((await backlinks(db, 'cdx_mara000001')).map(e => e.title)).toEqual(['Thoughts about the ending'])
    const out = await outgoingLinks(db, 'scn_arr1val001')
    expect(out.resolved.map(e => e.id)).toEqual(['cdx_h0llowbay1'])
  })

  it('reports unresolved links', async () => {
    await writeFile(join(root, 'notes/ending.md'), '---\nid: nte_end1ng0001\ntitle: T\n---\n[[Nowhere]]\n')
    await applyChange(db, repo, { kind: 'changed', path: 'notes/ending.md' })
    expect((await outgoingLinks(db, 'nte_end1ng0001')).unresolved).toEqual(['nowhere'])
  })

  it('applies incremental changes and removals', async () => {
    await writeFile(join(root, 'research/tides.md'), '---\nid: rsc_t1des00001\ntitle: Tides\n---\nNeap tides are weak.\n')
    await applyChange(db, repo, { kind: 'changed', path: 'research/tides.md' })
    expect((await searchEntries(db, 'neap')).map(h => h.id)).toEqual(['rsc_t1des00001'])
    await applyChange(db, repo, { kind: 'removed', path: 'research/tides.md' })
    expect(await searchEntries(db, 'neap')).toEqual([])
  })

  it('matches a full rebuild after a sequence of edits', async () => {
    const created = await repo.create({ type: 'note', dir: 'notes', title: 'Storm', body: 'A storm about [[Hollow Bay]].' })
    await applyChange(db, repo, { kind: 'added', path: created.path })
    await repo.move('research/tides.md', 'notes')
    await applyChange(db, repo, { kind: 'removed', path: 'research/tides.md' })
    await applyChange(db, repo, { kind: 'added', path: 'notes/tides.md' })

    const fresh = await openIndexDb(':memory:')
    await syncIndex(fresh, repo)
    const snapshot = async (d: IndexDb) => (await d.$client.execute('SELECT id, path, hash, word_count FROM entries ORDER BY id')).rows
    expect(await snapshot(db)).toEqual(await snapshot(fresh))
    fresh.$client.close()
  })
})
