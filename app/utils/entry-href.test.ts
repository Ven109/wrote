import { describe, expect, it } from 'vitest'
import { entryHref } from './entry-href'

describe('entryHref', () => {
  it('routes entries to their section', () => {
    expect(entryHref('b', { type: 'scene', path: 'manuscript/a/b/01-x.md' })).toBe('/books/b/write/manuscript/a/b/01-x.md')
    expect(entryHref('b', { type: 'note', path: 'notes/x.md' })).toBe('/books/b/notes/notes/x.md')
    expect(entryHref('b', { type: 'codex', path: 'codex/places/x.md' })).toBe('/books/b/codex/codex/places/x.md')
  })
})
