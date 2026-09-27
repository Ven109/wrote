import { useQuery } from '@pinia/colada'
import { refDebounced } from '@vueuse/core'
import { bookSearchQuery } from '~/queries/search'
import { searchHitItems } from '~/utils/search-hits'

/**
 * Book search in the ⌘K palette: what is typed is searched in the current book (by words and, with
 * embeddings set up, by meaning) and shown as an "In this book" group.
 */
export function useBookSearch(bookId: MaybeRefOrGetter<string | null>) {
  const { searchTerm, open, registerGroup } = useCommandPalette()
  const term = refDebounced(computed(() => searchTerm.value.trim()), 250)
  const { data, status } = useQuery(() => bookSearchQuery({ bookId: toValue(bookId) ?? '', q: term.value }))
  const hits = computed(() => (toValue(bookId) && term.value.length >= 2 ? data.value ?? [] : []))
  const close = () => {
    open.value = false
  }

  registerGroup('book-search', () => ({
    id: 'book-search',
    label: 'In this book',
    // The server already ranked these; the palette's own fuzzy filter would drop meaning matches.
    ignoreFilter: true,
    items: searchHitItems(toValue(bookId) ?? '', hits.value, close),
  }))

  return { hits, status }
}
