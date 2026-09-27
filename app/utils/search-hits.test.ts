import { describe, expect, it, vi } from 'vitest'
import type { BookSearchHit } from '#shared/schemas/search'
import { plainSnippet, searchHitItems } from './search-hits'

const hit = (match: BookSearchHit['match'], snippet = 'The <mark>tide</mark> was out'): BookSearchHit =>
  ({ id: 'scn_1', path: 'manuscript/a.md', type: 'scene', title: 'Arrival', snippet, score: 0.1, match })

describe('search hits', () => {
  it('strips mark tags from snippets', () => {
    expect(plainSnippet('The <mark>tide</mark>\n was  out')).toBe('The tide was out')
  })

  it('turns hits into palette items with routes and match icons', () => {
    const onSelect = vi.fn()
    const [text, meaning] = searchHitItems('book', [hit('text'), { ...hit('meaning', 'Nobody looked'), id: 'scn_2', type: 'note', path: 'notes/n.md' }], onSelect)
    expect(text).toMatchObject({ label: 'Arrival', suffix: 'The tide was out', icon: 'i-lucide-text-search', to: '/books/book/write/manuscript/a.md' })
    expect(meaning).toMatchObject({ 'icon': 'i-lucide-sparkles', 'to': '/books/book/notes/notes/n.md', 'aria-label': 'Arrival – Matches the meaning' })
    expect(meaning!.onSelect).toBe(onSelect)
  })
})
