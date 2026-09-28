import { describe, expect, it } from 'vitest'
import { BOOK_SECTIONS, bookNavigationItems, SETTINGS_ITEMS, settingsMenuItems } from './useAppNavigation'

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
    let nav!: ReturnType<typeof useAppNavigation>
    useNuxtApp().runWithContext(() => {
      nav = useAppNavigation()
    })
    const { items, bookId } = nav
    expect(bookId.value).toBeNull()
    expect(items.value).toEqual([[expect.objectContaining({ label: 'Library', to: '/' })]])
  })
})

describe('settingsMenuItems', () => {
  it('groups the settings pages under an "AI Agents" label', () => {
    const [group] = settingsMenuItems()
    expect(group![0]).toEqual({ type: 'label', label: 'AI Agents' })
    expect(group!.slice(1).map(item => item.to)).toEqual(SETTINGS_ITEMS.map(item => item.to))
    expect(group!.slice(1).map(item => item.label)).toEqual(['AI models', 'Connect agents', 'Integrations', 'Usage'])
  })
})
