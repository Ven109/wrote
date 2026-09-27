import { describe, expect, it } from 'vitest'
import { BOOK_SECTIONS, bookNavigationItems } from './useAppNavigation'

describe('bookNavigationItems', () => {
  it('links every book section under the book route', () => {
    const items = bookNavigationItems('my-novel')
    expect(items).toHaveLength(BOOK_SECTIONS.length)
    expect(items[0]).toMatchObject({ label: 'Write', to: '/books/my-novel/write' })
    expect(items.every(item => String(item.to).startsWith('/books/my-novel/'))).toBe(true)
  })
})

describe('useAppNavigation', () => {
  it('shows only global items outside a book', () => {
    const { items, bookId } = useAppNavigation()
    expect(bookId.value).toBeNull()
    expect(items.value).toHaveLength(1)
    expect(items.value[0]![0]).toMatchObject({ label: 'Library', to: '/' })
  })
})
