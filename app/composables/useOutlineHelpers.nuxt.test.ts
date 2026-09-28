import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { Outline } from '#shared/schemas/outline'
import { HELPER_ALL, useOutlineHelpers } from './useOutlineHelpers'

const bodies: Record<string, unknown[]> = { bridge: [], review: [] }
registerEndpoint('/api/books/help-book/outline/helpers/bridge', { method: 'POST', handler: async (event) => {
  bodies.bridge!.push(await readBody(event))
  return [{ id: 'opr_1' }, { id: 'opr_2' }]
} })
registerEndpoint('/api/books/help-book/outline/helpers/review', { method: 'POST', handler: async (event) => {
  bodies.review!.push(await readBody(event))
  return []
} })
registerEndpoint('/api/templates/beat-sheets', () => ({ folder: '/t', sheets: [
  { id: 'three', title: 'Three Acts', description: '', outline: { notes: '', acts: [{ id: '', title: 'One', beats: [{ id: '', title: 'Hook', summary: '', scenes: [] }, { id: '', title: 'Storm', summary: '', scenes: [] }] }] } },
] }))

describe('useOutlineHelpers', () => {
  it('bridges a beat to the next one and reviews an act against the likely beat sheet', async () => {
    const outline = ref<Outline>({ notes: '', acts: [
      { id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'Hook', summary: '', scenes: [] }, { id: 'bt_b', title: 'Storm', summary: '', scenes: [] }] },
      { id: 'act_2', title: 'Two', beats: [{ id: 'bt_c', title: 'End', summary: '', scenes: [] }] },
    ] })
    let helpers!: ReturnType<typeof useOutlineHelpers>
    await mountSuspended(defineComponent({
      setup() {
        helpers = useOutlineHelpers('help-book', outline)
        return () => h('div')
      },
    }))
    helpers.openBridge(outline.value.acts[0]!.beats[1]!)
    expect(helpers.form.value).toEqual({ kind: 'bridge', fromBeatId: 'bt_b', toBeatId: 'bt_c' })
    expect(helpers.beatItems.value[2]).toEqual({ label: 'Two › End', value: 'bt_c' })
    await helpers.run()
    expect(bodies.bridge).toEqual([{ fromBeatId: 'bt_b', toBeatId: 'bt_c' }])
    expect(helpers.open.value).toBe(false)

    helpers.openReview('act_2')
    await vi.waitFor(() => expect(helpers.form.value).toEqual({ kind: 'review', actId: 'act_2', templateId: 'three' }))
    helpers.form.value = { kind: 'review', actId: HELPER_ALL, templateId: HELPER_ALL }
    await helpers.run()
    expect(bodies.review).toEqual([{}])
  })

  it('cannot bridge a beat to itself', async () => {
    const outline = ref<Outline>({ notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }] }] })
    let helpers!: ReturnType<typeof useOutlineHelpers>
    await mountSuspended(defineComponent({
      setup() {
        helpers = useOutlineHelpers('help-book', outline)
        return () => h('div')
      },
    }))
    expect(helpers.canBridge.value).toBe(false)
    helpers.openBridge()
    expect(helpers.canRun.value).toBe(false)
  })
})
