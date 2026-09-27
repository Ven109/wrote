import { describe, expect, it } from 'vitest'
import { BOOK_SECTIONS, bookNavigationItems } from './useAppNavigation'

describe('bookNavigationItems', () => {
  it('links every book section under the book route', () => {
    const items = bookNavigationItems('my-novel')
    expect(items).toHaveLength(BOOK_SECTIONS.length)
    expect(items[0]).toMatchObject({ label: 'Write', to: '/books/my-novel/write' })
    expect(items.every(item => String(item.to).startsWith('/books/my-novel/'))).toBe(true)
  })

  it('shows badges only for non-zero counts', () => {
    const items = bookNavigationItems('b', { notes: 3 })
    expect(items.find(item => item.label === 'Notes')?.badge).toBe(3)
    expect(bookNavigationItems('b', { notes: 0 }).find(item => item.label === 'Notes')?.badge).toBeUndefined()
  })
})

describe('useAppNavigation', () => {
  it('shows only global items outside a book', () => {
    const { items, bookId } = useAppNavigation()
    expect(bookId.value).toBeNull()
    expect(items.value).toHaveLength(1)
    expect(items.value[0]![0]).toMatchObject({ label: 'Library', to: '/' })
    expect(items.value[0]![1]).toMatchObject({ label: 'AI models', to: '/settings/ai' })
  })
})
