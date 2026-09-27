import type { CommandPaletteItem } from '@nuxt/ui'
import type { BookSearchHit } from '#shared/schemas/search'
import { entryHref } from './entry-href'

/** Snippet as plain text: drops the `<mark>` tags of full-text matches. */
export function plainSnippet(snippet: string): string {
  return snippet.replace(/<\/?mark>/g, '').replace(/\s+/g, ' ').trim()
}

const MATCH_ICON = { text: 'i-lucide-text-search', both: 'i-lucide-sparkles', meaning: 'i-lucide-sparkles' } as const
const MATCH_LABEL = { text: 'Matches the words', both: 'Matches the words and the meaning', meaning: 'Matches the meaning' } as const

/** Palette items for search hits; hits found by meaning get the AI sparkles icon. */
export function searchHitItems(bookId: string, hits: BookSearchHit[], onSelect: () => void): CommandPaletteItem[] {
  return hits.map(hit => ({
    'id': `search:${hit.id}`,
    'label': hit.title,
    'suffix': plainSnippet(hit.snippet),
    'icon': MATCH_ICON[hit.match],
    'ui': { itemLeadingIcon: hit.match === 'text' ? undefined : 'text-primary' },
    'aria-label': `${hit.title} – ${MATCH_LABEL[hit.match]}`,
    'to': entryHref(bookId, hit),
    onSelect,
  }))
}
