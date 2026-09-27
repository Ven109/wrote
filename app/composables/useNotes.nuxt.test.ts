import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { getQuery } from 'h3'
import type { NoteSummary } from '#shared/schemas/notes'
import { useNotes } from './useNotes'

const queries: Record<string, unknown>[] = []
const note = (title: string): NoteSummary => ({ id: `nte_${title}0000001`, path: `notes/${title}.md`, title, tags: [], pinned: false, inbox: false, updated: null, excerpt: '' })
registerEndpoint('/api/books/nb/notes', (event) => {
  const query = getQuery(event)
  queries.push(query)
  return query.q === 'sea' ? [note('sea')] : [note('a'), note('b')]
})
registerEndpoint('/api/books/nb/notes/counts', () => ({ all: 2, inbox: 1, pinned: 0, tags: [] }))

describe('useNotes', () => {
  it('combines filter, tag and debounced search into the query', async () => {
    let api!: ReturnType<typeof useNotes>
    await mountSuspended(defineComponent({
      setup() {
        api = useNotes('nb')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.notes.value).toHaveLength(2))
    expect(api.counts.value?.inbox).toBe(1)
    api.filter.value = 'inbox'
    api.tag.value = 'idea'
    api.search.value = 'sea'
    await vi.waitFor(() => expect(api.notes.value.map(n => n.title)).toEqual(['sea']))
    expect(queries.at(-1)).toEqual({ filter: 'inbox', tag: 'idea', q: 'sea' })
  })
})
