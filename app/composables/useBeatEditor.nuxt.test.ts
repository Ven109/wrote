import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { Beat, OutlineOp } from '#shared/schemas/outline'
import { useBeatEditor } from './useBeatEditor'

const created: unknown[] = []
registerEndpoint('/api/books/beat-book/structure', () => [{ id: 'prt_1', type: 'part', title: 'One', path: 'p', wordCount: 0, children: [
  { id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'c', wordCount: 0, children: [{ id: 'scn_1', type: 'scene', title: 'Arrival', path: 's', wordCount: 0, children: [] }] },
] }])
registerEndpoint('/api/books/beat-book/outline/beats/bt_a/scene', { method: 'POST', handler: async (event) => {
  created.push(await readBody(event))
  return { sceneId: 'scn_new', path: 'manuscript/x/new.md', outline: { hash: 'h', outline: { notes: '', acts: [] } } }
} })

describe('useBeatEditor', () => {
  it('links scenes, suggests the chapter and creates a scene from the beat', async () => {
    const applied: OutlineOp[] = []
    let editor!: ReturnType<typeof useBeatEditor>
    await mountSuspended(defineComponent({
      setup() {
        editor = useBeatEditor('beat-book', async (...ops) => applied.push(...ops))
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(editor.scenes.value).toEqual([{ label: 'Harbor › Arrival', value: 'scn_1' }]))
    const beat: Beat = { id: 'bt_a', title: 'Storm', summary: 'Rain.', scenes: [] }
    editor.edit(beat)
    expect(editor.editing.value?.chapterId).toBe('chp_1')
    await editor.createScene()
    expect(created).toEqual([{ chapterId: 'chp_1' }])
    expect(editor.editing.value?.scenes).toEqual(['scn_new'])
    expect(editor.created.value).toEqual({ title: 'Storm', href: '/books/beat-book/write/manuscript/x/new.md' })
    editor.editing.value!.scenes.push('scn_1')
    await editor.save()
    expect(applied).toEqual([{ op: 'updateBeat', beatId: 'bt_a', title: 'Storm', summary: 'Rain.', scenes: ['scn_new', 'scn_1'] }])
  })
})
