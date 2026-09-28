import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { OutlineDocument, OutlineOp } from '#shared/schemas/outline'
import { applyOutlineOps } from '#shared/utils/outline-ops'
import { useOutline } from './useOutline'

let server: OutlineDocument = {
  hash: 'h0',
  outline: { notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }] }, { id: 'act_2', title: 'Two', beats: [] }] },
}
const sent: { ops: OutlineOp[], expectedHash?: string }[] = []
registerEndpoint('/api/books/otl-book/outline', () => server)
registerEndpoint('/api/books/otl-book/outline/ops', { method: 'POST', handler: async (event) => {
  const body = await readBody<{ ops: OutlineOp[], expectedHash?: string }>(event)
  sent.push(body)
  await new Promise(resolve => setTimeout(resolve, 20))
  server = { hash: `h${sent.length}`, outline: applyOutlineOps(server.outline, body.ops, () => 'x') }
  return server
} })

describe('useOutline', () => {
  it('shows edits at once and saves them one after another, each against the previous save', async () => {
    let outline!: ReturnType<typeof useOutline>
    await mountSuspended(defineComponent({
      setup() {
        outline = useOutline('otl-book')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(outline.outline.value.acts).toHaveLength(2))
    void outline.apply({ op: 'moveBeat', beatId: 'bt_a', actId: 'act_2', index: 0 })
    const last = outline.apply({ op: 'addBeat', actId: 'act_1', title: 'New', summary: '' })
    expect(outline.outline.value.acts.map(act => act.beats.map(beat => beat.title))).toEqual([['New'], ['A']])
    await last
    expect(sent.map(request => request.expectedHash)).toEqual(['h0', 'h1'])
    expect((sent[1]!.ops[0] as { id?: string }).id).toMatch(/^bt_/)
    expect(outline.outline.value.acts.map(act => act.beats.map(beat => beat.title))).toEqual([['New'], ['A']])
  })
})
