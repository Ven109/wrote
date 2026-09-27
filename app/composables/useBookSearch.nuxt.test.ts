import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { useBookSearch } from './useBookSearch'

const queries: string[] = []
registerEndpoint('/api/books/demo/search', (event) => {
  const q = String(getQuery(event).q)
  queries.push(q)
  return [{ id: 'scn_1', path: 'manuscript/m.md', type: 'scene', title: 'The Meeting', snippet: 'Nobody would look her in the eye.', score: 0.02, match: 'meaning' }]
})

describe('useBookSearch', () => {
  it('searches the book for the palette term (debounced) and shows an "In this book" group', async () => {
    let palette!: ReturnType<typeof useCommandPalette>
    let search!: ReturnType<typeof useBookSearch>
    await mountSuspended(defineComponent({
      setup() {
        palette = useCommandPalette()
        search = useBookSearch('demo')
        return () => h('div')
      },
    }))
    const group = () => palette.groups.value.find(g => g.id === 'book-search')!
    expect(group().items).toEqual([])
    palette.searchTerm.value = 'g'
    palette.searchTerm.value = 'guilty Mara'
    await vi.waitFor(() => expect(search.hits.value).toHaveLength(1))
    expect(queries).toEqual(['guilty Mara'])
    expect(group()).toMatchObject({ label: 'In this book', ignoreFilter: true })
    expect(group().items![0]).toMatchObject({ label: 'The Meeting', icon: 'i-lucide-sparkles', to: '/books/demo/write/manuscript/m.md' })

    palette.open.value = true
    await nextTick()
    group().items![0]!.onSelect!(new Event('select'))
    expect(palette.open.value).toBe(false)
    await vi.waitFor(() => expect(search.hits.value).toEqual([]))
  })
})
