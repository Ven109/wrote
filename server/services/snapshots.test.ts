import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { undoActivity } from './activity'
import { isBulkChange, restoreSnapshot, snapshotBeforeBulkChange } from './snapshot-restore'
import { createSnapshot, deleteSnapshot, diffSnapshot, listSnapshotSummaries } from './snapshots'
import { closeAllBooks, openBook, type BookContext } from './workspace'

const run = promisify(execFile)
let book: BookContext
beforeEach(async () => {
  await closeAllBooks()
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

const ARRIVAL = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
const MAP = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'
const setBody = async (path: string, body: string) => {
  const entry = await book.repository.read(path)
  await book.repository.write(path, { frontmatter: entry.frontmatter, body }, entry.hash)
  await book.settle()
}
const body = async (path: string) => (await book.repository.read(path)).body

describe('snapshots', () => {
  it('snapshots a chapter, a scene or the whole book and lists them per document', async () => {
    const chapter = await createSnapshot(book, { name: 'Harbor draft 1', entryId: 'chp_harb0r0001' })
    expect(chapter.scope).toEqual({ kind: 'entry', entryId: 'chp_harb0r0001', title: 'The Harbor' })
    expect(chapter.files.map(f => f.path)).toEqual(['manuscript/01-part-one/01-the-harbor/01-arrival.md', 'manuscript/01-part-one/01-the-harbor/02-the-map.md', 'manuscript/01-part-one/01-the-harbor/index.md'])
    expect(chapter.words).toBeGreaterThan(20)
    const whole = await createSnapshot(book, { name: 'Before rewrite' })
    expect(whole.files.map(f => f.path)).toEqual(expect.arrayContaining(['wrote.json', 'outline.md', 'codex/characters/mara-velden.md']))
    await createSnapshot(book, { name: 'Map only', entryId: 'scn_themap0001' })
    expect((await listSnapshotSummaries(book, { path: ARRIVAL })).map(s => s.name)).toEqual(['Before rewrite', 'Harbor draft 1'])
    await expect(createSnapshot(book, { name: 'x', entryId: 'scn_missing001' })).rejects.toThrow(/not found/)
  })

  it('compares with now and restores the whole snapshot – undoable, with a safety snapshot first', async () => {
    const original = await body(ARRIVAL)
    const snapshot = await createSnapshot(book, { name: 'v1', entryId: 'chp_harb0r0001' })
    await setBody(ARRIVAL, 'Rewritten opening.\n')
    const diffs = await diffSnapshot(book, snapshot.id)
    expect(diffs.map(d => d.path)).toEqual([ARRIVAL])
    expect(diffs[0]!.before).toContain(original.trim())

    const result = await restoreSnapshot(book, snapshot.id)
    expect(result.restored).toEqual([ARRIVAL])
    expect(await body(ARRIVAL)).toBe(original)
    expect(result.safety).toMatchObject({ auto: true, name: 'Before restoring "v1"' })
    expect(result.activity).toMatchObject({ tool: 'restore_snapshot', undoable: true })

    await undoActivity(book, result.activity!.id)
    expect(await body(ARRIVAL)).toBe('Rewritten opening.\n')
    expect((await restoreSnapshot(book, result.safety!.id)).restored).toEqual([])
  })

  it('restores single blocks of one file and refuses when the file changed since the comparison', async () => {
    await setBody(ARRIVAL, 'One.\n\nTwo.\n\nThree.\n')
    const snapshot = await createSnapshot(book, { name: 'three paragraphs', entryId: 'scn_arr1val001' })
    await setBody(ARRIVAL, 'One.\n\nTwo changed.\n\nThree changed.\n')
    const [diff] = await diffSnapshot(book, snapshot.id, ARRIVAL)
    // Blocks: frontmatter, One, Two → Two changed (2), Three → Three changed (3)
    await restoreSnapshot(book, snapshot.id, { path: ARRIVAL, blocks: [2], expectedHash: diff!.currentHash })
    expect(await body(ARRIVAL)).toBe('One.\n\nTwo.\n\nThree changed.\n')
    await expect(restoreSnapshot(book, snapshot.id, { path: ARRIVAL, blocks: [3], expectedHash: diff!.currentHash })).rejects.toThrow(/changed on disk/)
  })

  it('whole-book restores remove files created since', async () => {
    const snapshot = await createSnapshot(book, { name: 'book' })
    await book.repository.create({ type: 'note', dir: 'notes', title: 'Later idea' })
    await book.settle()
    const result = await restoreSnapshot(book, snapshot.id)
    expect(result.restored).toEqual([expect.stringMatching(/^notes\/later-idea/)])
    await undoActivity(book, result.activity!.id)
    expect((await book.repository.readRaw(result.restored[0]!))).toContain('Later idea')
  })

  it('deletes snapshots and their unreferenced content', async () => {
    const a = await createSnapshot(book, { name: 'a', entryId: 'scn_arr1val001' })
    await setBody(ARRIVAL, 'Different.\n')
    const b = await createSnapshot(book, { name: 'b', entryId: 'scn_arr1val001' })
    const objects = join(book.repository.root, '.wrote/snapshots/objects')
    expect(await readdir(objects)).toHaveLength(2)
    await deleteSnapshot(book, a.id)
    expect(await readdir(objects)).toEqual([`${b.files[0]!.hash}.gz`])
    await expect(deleteSnapshot(book, a.id)).rejects.toThrow(/not found/)
  })

  it('commits manual snapshots to git when enabled and the book is a repository', async () => {
    const git = (...args: string[]) => run('git', ['-C', book.repository.root, ...args])
    await git('init', '-q')
    await git('-c', 'user.email=t@t', '-c', 'user.name=T', 'commit', '-q', '--allow-empty', '-m', 'init')
    await git('config', 'user.email', 't@t')
    await git('config', 'user.name', 'T')
    expect((await createSnapshot(book, { name: 'off' })).commit).toBeNull()
    await book.repository.writeConfig({ ...(await book.repository.readConfig()), snapshots: { git: true } })
    const snapshot = await createSnapshot(book, { name: 'First draft done', entryId: 'chp_harb0r0001' })
    expect(snapshot.commit).toMatch(/^[a-f0-9]{40}$/)
    expect((await git('log', '-1', '--format=%s')).stdout.trim()).toBe('Snapshot: First draft done')
    expect((await createSnapshot(book, { name: 'unchanged', entryId: 'chp_harb0r0001' })).commit).toBeNull()
  })
})

describe('automatic snapshots before AI bulk actions', () => {
  it('snapshot the before-state of multi-file and multi-block changes only', async () => {
    const one = [{ path: MAP, before: 'A\n\nB\n', after: 'A\n\nB2\n' }]
    const many = [{ path: MAP, before: 'A\n\nB\n', after: 'A2\n\nB2\n' }]
    expect([isBulkChange(one), isBulkChange(many), isBulkChange([...one, { path: ARRIVAL, before: null, after: 'x' }])]).toEqual([false, true, true])
    const actor = { kind: 'mcp' as const, name: 'Claude Code' }
    expect(await snapshotBeforeBulkChange(book, one, 'Rewrite', actor)).toBeNull()
    const snapshot = await snapshotBeforeBulkChange(book, many, 'Rewrite', actor)
    expect(snapshot).toMatchObject({ auto: true, name: 'Before Rewrite (Claude Code)', files: [{ path: MAP }] })
  })
})
