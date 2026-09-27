import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import { useProvenance } from './useProvenance'

const range = { id: 'prv_1', text: 'creased', before: '', after: '', author: { kind: 'assistant', name: 'AI' }, model: null, suggestionId: null, acceptedAt: '2026-09-27T10:00:00.000Z', changed: 0, words: 1 }
let provenanceRequests = 0
registerEndpoint('/api/books/demo/provenance', () => {
  provenanceRequests++
  return { entryId: 'scn_1', ranges: [range], stats: { aiWords: 1, totalWords: 10, share: 0.1 } }
})
registerEndpoint('/api/books/demo/provenance/stats', () => ({ book: { aiWords: 1, totalWords: 20, share: 0.05 }, entries: { scn_1: { aiWords: 1, totalWords: 10, share: 0.1 } } }))
registerEndpoint('/api/books/demo/structure', () => [])

const doc: EntryDocument = { id: 'scn_1', path: 'manuscript/a.md', type: 'scene', title: 'A', body: '', hash: 'h', frontmatter: {} }

describe('useProvenance', () => {
  it('loads passages only while highlighting is on and reports AI-assisted shares', async () => {
    let provenance!: ReturnType<typeof useProvenance>
    await mountSuspended(defineComponent({
      setup() {
        provenance = useProvenance('demo', ref(doc))
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(provenance.shares.value).toEqual({ scene: 0.1, chapter: null, book: 0.05 }))
    expect(provenance.context.shown.value).toEqual([])
    expect(provenanceRequests).toBe(0)
    provenance.toggle()
    await vi.waitFor(() => expect(provenance.context.shown.value).toEqual([range]))
    provenance.toggle()
    expect(provenance.context.shown.value).toEqual([])
  })
})
