import type { NavigationMenuItem } from '@nuxt/ui'

/** Book sections shown in the sidebar once a book is open. */
export const BOOK_SECTIONS = [
  { key: 'write', label: 'Write', icon: 'i-lucide-feather' },
  { key: 'notes', label: 'Notes', icon: 'i-lucide-sticky-note' },
  { key: 'codex', label: 'Codex', icon: 'i-lucide-book-user' },
  { key: 'outline', label: 'Outline', icon: 'i-lucide-list-tree' },
  { key: 'research', label: 'Research', icon: 'i-lucide-library' },
  { key: 'goals', label: 'Goals', icon: 'i-lucide-target' },
  { key: 'settings', label: 'Settings', icon: 'i-lucide-settings' },
] as const

type SectionKey = (typeof BOOK_SECTIONS)[number]['key']

export function bookNavigationItems(bookId: string, badges: Partial<Record<SectionKey, number>> = {}): NavigationMenuItem[] {
  return BOOK_SECTIONS.map(section => ({
    label: section.label,
    icon: section.icon,
    to: `/books/${bookId}/${section.key}`,
    badge: badges[section.key] || undefined,
  }))
}

/** Sidebar navigation: global items plus book sections for the book in the current route. */
export function useAppNavigation() {
  const route = useRoute()
  const bookId = computed(() => {
    const param = route.params.book
    return typeof param === 'string' && param ? param : null
  })

  /** Book-relative path of the entry open in the editor (`/books/:book/write/<path>`). */
  const activeEntryPath = computed(() => {
    const param = route.params.path
    const parts = Array.isArray(param) ? param : param ? [param] : []
    return parts.length ? parts.join('/') : null
  })

  const { counts: noteCounts } = useNoteCounts(bookId)
  const badges = computed(() => ({ notes: noteCounts.value?.inbox ?? 0 }))

  const items = computed<NavigationMenuItem[][]>(() => {
    const global: NavigationMenuItem[] = [
      { label: 'Library', icon: 'i-lucide-library-big', to: '/', exact: true },
      { label: 'AI models', icon: 'i-lucide-sparkles', to: '/settings/ai' },
      { label: 'Connect agents', icon: 'i-lucide-plug', to: '/settings/mcp' },
    ]
    return bookId.value ? [global, bookNavigationItems(bookId.value, badges.value)] : [global]
  })

  return { bookId, activeEntryPath, items }
}
