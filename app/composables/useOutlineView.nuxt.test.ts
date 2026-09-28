import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { OutlineDocument, OutlineOp } from '#shared/schemas/outline'
import { useOutlineView } from './useOutlineView'

const doc: OutlineDocument = { hash: 'h', outline: { notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }] }] } }
const sent: OutlineOp[][] = []
registerEndpoint('/api/books/otlv-book/outline', () => doc)
registerEndpoint('/api/books/otlv-book/structure', () => [])
registerEndpoint('/api/books/otlv-book/outline/ops', { method: 'POST', handler: async (event) => {
  sent.push((await readBody<{ ops: OutlineOp[] }>(event)).ops)
  return doc
} })

describe('useOutlineView', () => {
  it('offers only possible moves, and turns prompts and confirmations into outline edits', async () => {
    let view!: ReturnType<typeof useOutlineView>
    await mountSuspended(defineComponent({
      setup() {
        view = useOutlineView('otlv-book')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(view.outline.value.acts).toHaveLength(1))
    const beat = view.outline.value.acts[0]!.beats[0]!
    expect(view.beatMenu(beat)[1]!.map(item => item.disabled)).toEqual([true, true, true, true])

    view.addBeat(view.outline.value.acts[0]!)
    expect(view.promptOpen.value).toBe(true)
    expect(view.promptTitle.value).toBe('New beat')
    view.submitTitle('B')
    view.edit(beat)
    view.beats.editing.value!.summary = 'Storm.'
    await view.beats.save()
    await vi.waitFor(() => expect(sent).toHaveLength(2))
    expect(sent[0]).toMatchObject([{ op: 'addBeat', actId: 'act_1', title: 'B' }])
    expect(sent[1]).toEqual([{ op: 'updateBeat', beatId: 'bt_a', title: 'A', summary: 'Storm.', scenes: [] }])
  })
})
