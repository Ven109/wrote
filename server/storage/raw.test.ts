import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readRawFile, restoreRawFile } from './raw'
import { createTempDir } from '../../test/utils/workspace'

let root: string
beforeEach(async () => {
  root = await createTempDir('wrote-raw-')
})
afterEach(() => rm(root, { recursive: true, force: true }))

describe('raw book files', () => {
  it('restores a recorded state, announcing writes, and removes files recorded as missing', async () => {
    const onWrite = vi.fn()
    expect(await readRawFile(root, 'notes/a.md')).toBeNull()
    await restoreRawFile(root, 'notes/a.md', '---\nid: n\n---\nHi', onWrite)
    expect(await readRawFile(root, 'notes/a.md')).toBe('---\nid: n\n---\nHi')
    expect(onWrite).toHaveBeenCalledWith('notes/a.md', expect.any(String))
    await restoreRawFile(root, 'notes/a.md', null, onWrite)
    expect(await readRawFile(root, 'notes/a.md')).toBeNull()
    expect(onWrite).toHaveBeenLastCalledWith('notes/a.md', null)
  })

  it('removes the folder of a part or chapter once its index file is gone', async () => {
    await restoreRawFile(root, 'manuscript/01-part/index.md', 'x')
    await restoreRawFile(root, 'manuscript/01-part/index.md', null)
    expect(await readdir(join(root, 'manuscript'))).toEqual([])
  })

  it('rejects paths outside the book', async () => {
    await expect(restoreRawFile(root, '../evil.md', 'x')).rejects.toThrow()
  })
})
