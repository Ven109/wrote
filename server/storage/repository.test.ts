import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { ConflictError, NotFoundError } from './errors'
import { createBookRepository, type BookRepository } from './repository'

describe('book repository', () => {
  let root: string
  let cleanup: () => Promise<void>
  let repo: BookRepository

  beforeEach(async () => {
    ({ root, cleanup } = await copyFixtureBook())
    repo = createBookRepository(root)
  })
  afterEach(() => cleanup())

  it('lists all entries of the sample book', async () => {
    const { entries, errors } = await repo.list()
    expect(errors).toEqual([])
    expect(entries.map(e => e.type).sort()).toEqual([
      'chapter', 'chapter', 'codex', 'codex', 'note', 'note', 'outline', 'part', 'research', 'scene', 'scene', 'scene', 'style-guide',
    ])
  })

  it('reports invalid files without failing the listing', async () => {
    await writeFile(join(root, 'notes', 'broken.md'), '---\ntitle: no id\n---\n')
    const { entries, errors } = await repo.list()
    expect(entries).toHaveLength(13)
    expect(errors.map(e => e.message)).toEqual([expect.stringContaining('notes/broken.md')])
  })

  it('round-trips every entry byte-identically', async () => {
    const { entries } = await repo.list()
    for (const entry of entries) {
      const before = await readFile(join(root, entry.path), 'utf8')
      await repo.write(entry.path, entry, entry.hash)
      expect(await readFile(join(root, entry.path), 'utf8'), entry.path).toBe(before)
    }
  })

  it('writes changes and preserves unknown fields', async () => {
    const mara = await repo.read('codex/characters/mara-velden.md')
    const saved = await repo.write(mara.path, { ...mara, frontmatter: { ...mara.frontmatter, title: 'Mara V.' } }, mara.hash)
    expect(saved.frontmatter).toMatchObject({ title: 'Mara V.', eyes: 'grey', role: 'protagonist' })
  })

  it('detects conflicting external edits', async () => {
    const scene = await repo.read('manuscript/01-part-one/01-the-harbor/01-arrival.md')
    await writeFile(join(root, scene.path), `${await readFile(join(root, scene.path), 'utf8')}\nExternal edit.\n`)
    await expect(repo.write(scene.path, scene, scene.hash)).rejects.toThrow(ConflictError)
  })

  it('creates scenes with the next order number and a fresh id', async () => {
    const created = await repo.create({ type: 'scene', dir: 'manuscript/01-part-one/01-the-harbor', title: 'Low Tide', body: 'Text' })
    expect(created.path).toBe('manuscript/01-part-one/01-the-harbor/03-low-tide.md')
    expect(created.frontmatter.id).toMatch(/^scn_/)
    expect((await repo.read(created.path)).body).toBe('Text')
  })

  it('creates parts and chapters as folders with index.md', async () => {
    const part = await repo.create({ type: 'part', dir: 'manuscript', title: 'Part Two' })
    expect(part.path).toBe('manuscript/02-part-two/index.md')
    const chapter = await repo.create({ type: 'chapter', dir: 'manuscript/02-part-two', title: 'Storm' })
    expect(chapter.path).toBe('manuscript/02-part-two/01-storm/index.md')
  })

  it('creates unordered notes with unique slugs', async () => {
    const a = await repo.create({ type: 'note', dir: 'notes/inbox', title: 'Idea' })
    const b = await repo.create({ type: 'note', dir: 'notes/inbox', title: 'Idea' })
    expect([a.path, b.path]).toEqual(['notes/inbox/idea.md', 'notes/inbox/idea-2.md'])
  })

  it('moves entries to the end of the target folder', async () => {
    const moved = await repo.move('manuscript/01-part-one/01-the-harbor/01-arrival.md', 'manuscript/01-part-one/02-the-drowned-guild')
    expect(moved).toBe('manuscript/01-part-one/02-the-drowned-guild/02-arrival.md')
    await expect(repo.read('manuscript/01-part-one/01-the-harbor/01-arrival.md')).rejects.toThrow(NotFoundError)
  })

  it('reorders siblings by renaming prefixes', async () => {
    const dir = 'manuscript/01-part-one/01-the-harbor'
    const renames = await repo.reorder(dir, ['02-the-map.md', '01-arrival.md'])
    expect(Object.fromEntries(renames)).toEqual({ '02-the-map.md': '01-the-map.md', '01-arrival.md': '02-arrival.md' })
    expect(await repo.listOrdered(dir)).toEqual(['01-the-map.md', '02-arrival.md'])
  })

  it('rejects reorder lists that do not match the folder', async () => {
    await expect(repo.reorder('manuscript/01-part-one/01-the-harbor', ['01-arrival.md'])).rejects.toThrow()
  })

  it('moves deleted entries to the trash', async () => {
    const trashPath = await repo.trash('manuscript/01-part-one/02-the-drowned-guild/index.md')
    expect(trashPath).toMatch(/^\.wrote\/trash\/.+\/manuscript\/01-part-one\/02-the-drowned-guild$/)
    expect(await readdir(join(root, 'manuscript/01-part-one'))).toEqual(['01-the-harbor', 'index.md'])
  })

  it('notifies write listeners', async () => {
    const writes: string[] = []
    repo.onWrite(path => writes.push(path))
    await repo.create({ type: 'note', dir: 'notes', title: 'Hello' })
    expect(writes).toEqual(['notes/hello.md'])
  })

  it('reads and writes the book config', async () => {
    const config = await repo.readConfig()
    await repo.writeConfig({ ...config, subtitle: 'A novel' })
    expect((await repo.readConfig()).subtitle).toBe('A novel')
  })
})
