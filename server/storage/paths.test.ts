import { describe, expect, it } from 'vitest'
import { InvalidPathError } from './errors'
import { resolveInBook } from './paths'

describe('resolveInBook', () => {
  const root = '/books/novel'

  it('resolves relative POSIX paths inside the book', () => {
    expect(resolveInBook(root, 'notes/a.md')).toBe('/books/novel/notes/a.md')
  })

  it.each(['', '/etc/passwd', '../other/a.md', 'notes/../../x.md', '.', 'a\0b'])('rejects %j', (path) => {
    expect(() => resolveInBook(root, path)).toThrow(InvalidPathError)
  })
})
