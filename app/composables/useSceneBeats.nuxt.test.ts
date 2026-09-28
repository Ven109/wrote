import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import { useSceneBeats } from './useSceneBeats'

registerEndpoint('/api/books/sb-book/beats', event => (getQuery(event).sceneId === 'scn_1' ? [{ id: 'bt_1', title: 'Storm', summary: '', actId: 'act_1', actTitle: 'Setup', scenes: ['scn_1'] }] : []))

describe('useSceneBeats', () => {
  it('shows the beats of a scene, and none for other entries', async () => {
    const document = ref({ id: 'scn_1', type: 'scene', path: 'x.md' } as EntryDocument)
    let beats!: ReturnType<typeof useSceneBeats>
    await mountSuspended(defineComponent({
      setup() {
        beats = useSceneBeats('sb-book', document)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(beats.beats.value.map(b => b.title)).toEqual(['Storm']))
    expect(beats.outlineHref.value).toBe('/books/sb-book/outline')
    document.value = { id: 'chp_1', type: 'chapter', path: 'y.md' } as EntryDocument
    await vi.waitFor(() => expect(beats.beats.value).toEqual([]))
  })
})
