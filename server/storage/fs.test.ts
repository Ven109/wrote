import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { hashContent, readTextIfExists, writeFileAtomic } from './fs'

describe('fs helpers', () => {
  let dir: string
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'wrote-fs-'))
  })
  afterEach(() => rm(dir, { recursive: true, force: true }))

  it('writes atomically, creating folders and leaving no temp files', async () => {
    const file = join(dir, 'a', 'b.md')
    await writeFileAtomic(file, 'hello')
    expect(await readFile(file, 'utf8')).toBe('hello')
    expect(await readdir(join(dir, 'a'))).toEqual(['b.md'])
  })

  it('returns null for missing files', async () => {
    expect(await readTextIfExists(join(dir, 'missing.md'))).toBeNull()
  })

  it('hashes content deterministically', () => {
    expect(hashContent('a')).toBe(hashContent('a'))
    expect(hashContent('a')).not.toBe(hashContent('b'))
  })
})
