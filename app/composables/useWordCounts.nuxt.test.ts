import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { StructureNode } from '#shared/schemas/manuscript'
import { useWordCounts } from './useWordCounts'

const scene: StructureNode = { id: 's1', type: 'scene', title: 'S', path: 's.md', wordCount: 2, children: [] }
const tree: StructureNode[] = [{ id: 'p', type: 'part', title: 'P', path: 'p.md', wordCount: 2, children: [{ id: 'c', type: 'chapter', title: 'C', path: 'c.md', wordCount: 2, children: [scene] }] }]
registerEndpoint('/api/books/wc/structure', () => tree)

describe('useWordCounts', () => {
  it('counts the draft live and tracks words written this session', async () => {
    const draft = ref('two words')
    let api!: ReturnType<typeof useWordCounts>
    await mountSuspended(defineComponent({
      setup() {
        api = useWordCounts('wc', 's1', draft)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.counts.value).toEqual({ scene: 2, chapter: 2, book: 2 }))
    expect(api.sessionWords.value).toBe(0)
    draft.value = 'now there are five words'
    await vi.waitFor(() => expect(api.counts.value).toEqual({ scene: 5, chapter: 5, book: 5 }))
    expect(api.sessionWords.value).toBe(3)
  })
})
