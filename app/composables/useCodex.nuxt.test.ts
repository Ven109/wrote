import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { getQuery, readBody } from 'h3'
import { BUILT_IN_CODEX_TYPES, type CodexEntrySummary } from '#shared/schemas/codex'
import { useCodex } from './useCodex'

const entry = (title: string, codexType: string): CodexEntrySummary => ({ id: `cdx_${title}00000`, path: `codex/x/${title}.md`, title, codexType, aliases: [], tags: codexType === 'place' ? ['coast'] : [], excerpt: '' })
const queries: Record<string, unknown>[] = []
const created: unknown[] = []
registerEndpoint('/api/books/cx/codex', {
  method: 'GET',
  handler: (event) => {
    const query = getQuery(event)
    queries.push(query)
    const all = [entry('mara', 'character'), entry('bay', 'place')]
    return query.type ? all.filter(e => e.codexType === query.type) : all
  },
})
registerEndpoint('/api/books/cx/codex', {
  method: 'POST',
  async handler(event) {
    created.push(await readBody(event))
    return { id: 'cdx_new0000001', path: 'codex/characters/oren.md' }
  },
})
registerEndpoint('/api/books/cx/codex/types', () => ({ types: BUILT_IN_CODEX_TYPES, errors: [] }))

describe('useCodex', () => {
  it('filters by type, collects tags and creates entries of a type', async () => {
    let api!: ReturnType<typeof useCodex>
    await mountSuspended(defineComponent({
      setup() {
        api = useCodex('cx')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.entries.value).toHaveLength(2))
    expect(api.tags.value).toEqual(['coast'])
    expect(api.newItems.value.map(item => item.label)).toContain('Character')
    api.type.value = 'place'
    await vi.waitFor(() => expect(api.entries.value.map(e => e.title)).toEqual(['bay']))
    expect(queries.at(-1)).toEqual({ type: 'place' })

    api.newItems.value[0]!.onSelect()
    expect(api.creating.value).toBe(true)
    await api.submitNew('Oren')
    expect(created).toEqual([{ type: 'character', title: 'Oren' }])
    expect(api.creating.value).toBe(false)
    await vi.waitFor(() => expect(useRoute().fullPath).toBe('/books/cx/codex/codex/characters/oren.md'))
  })
})
