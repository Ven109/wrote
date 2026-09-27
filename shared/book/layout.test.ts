import { describe, expect, it } from 'vitest'
import { entryTypeFromPath, isInboxPath } from './layout'

describe('entryTypeFromPath', () => {
  it.each([
    ['manuscript/01-part-one/index.md', 'part'],
    ['manuscript/01-part-one/01-the-harbor/index.md', 'chapter'],
    ['manuscript/01-part-one/01-the-harbor/01-arrival.md', 'scene'],
    ['notes/inbox/idea.md', 'note'],
    ['notes/ending.md', 'note'],
    ['codex/characters/mara.md', 'codex'],
    ['research/tides.md', 'research'],
    ['outline.md', 'outline'],
    ['style-guide.md', 'style-guide'],
  ] as const)('%s is a %s', (path, type) => {
    expect(entryTypeFromPath(path)).toBe(type)
  })

  it.each([
    'README.md',
    'wrote.json',
    'manuscript/stray.md',
    'manuscript/a/b/c/too-deep.md',
    'codex/image.png',
  ])('%s is not an entry', (path) => {
    expect(entryTypeFromPath(path)).toBeNull()
  })

  it('detects inbox notes', () => {
    expect(isInboxPath('notes/inbox/a.md')).toBe(true)
    expect(isInboxPath('notes/a.md')).toBe(false)
  })
})
