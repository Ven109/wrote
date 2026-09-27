import { writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { copyFixtureBook } from '../../test/utils/fixture-book'
import { hashContent } from './fs'
import { createBookWatcher, type BookChangeEvent, type BookWatcher } from './watcher'

function waitFor(predicate: () => boolean, timeout = 3000) {
  return new Promise<void>((resolve, reject) => {
    const started = Date.now()
    const tick = () => {
      if (predicate()) return resolve()
      if (Date.now() - started > timeout) return reject(new Error('timed out'))
      setTimeout(tick, 20)
    }
    tick()
  })
}

describe('book watcher', () => {
  let root: string
  let cleanup: () => Promise<void>
  let watcher: BookWatcher
  let events: BookChangeEvent[]

  beforeEach(async () => {
    ({ root, cleanup } = await copyFixtureBook())
    events = []
    watcher = createBookWatcher(root, { onChange: (e) => {
      events.push(e)
    }, debounceMs: 30 })
    await watcher.ready
  })
  afterEach(async () => {
    await watcher.close()
    await cleanup()
  })

  it('emits changes for external edits', async () => {
    await writeFile(join(root, 'notes/ending.md'), '---\nid: nte_end1ng0001\ntitle: Changed\n---\n')
    await waitFor(() => events.length > 0)
    expect(events).toEqual([{ kind: 'changed', path: 'notes/ending.md' }])
  })

  it('emits added and removed events', async () => {
    await writeFile(join(root, 'notes/new.md'), '---\nid: nte_new0000001\ntitle: New\n---\n')
    await rm(join(root, 'research/tides.md'))
    await waitFor(() => events.length >= 2)
    expect(events).toEqual(expect.arrayContaining([
      { kind: 'added', path: 'notes/new.md' },
      { kind: 'removed', path: 'research/tides.md' },
    ]))
  })

  it('ignores the app\'s own writes and non-entry files', async () => {
    const content = '---\nid: nte_end1ng0001\ntitle: Own write\n---\n'
    watcher.ignoreOwnWrite('notes/ending.md', hashContent(content))
    await writeFile(join(root, 'notes/ending.md'), content)
    await writeFile(join(root, 'README.txt'), 'x')
    await new Promise(resolve => setTimeout(resolve, 300))
    expect(events).toEqual([])
  })
})
