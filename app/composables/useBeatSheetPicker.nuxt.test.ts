import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { BeatSheetList, Outline, OutlineOp } from '#shared/schemas/outline'
import { useBeatSheetPicker } from './useBeatSheetPicker'

const list: BeatSheetList = {
  folder: '/ws/templates/beat-sheets',
  sheets: [
    { id: 'duo', title: 'Duo', description: '', outline: { notes: '', acts: [{ id: '', title: 'One', beats: [{ id: '', title: 'Start', summary: '', scenes: [] }, { id: '', title: 'End', summary: 'Fin.', scenes: [] }] }] } },
  ],
}
let requests = 0
registerEndpoint('/api/templates/beat-sheets', () => {
  requests++
  return list
})

describe('useBeatSheetPicker', () => {
  it('loads templates when opened, previews and applies only the missing beats', async () => {
    const outline = ref<Outline>({ notes: '', acts: [{ id: 'act_1', title: 'one', beats: [{ id: 'bt_1', title: 'start', summary: '', scenes: [] }] }] })
    const applied: OutlineOp[] = []
    let picker!: ReturnType<typeof useBeatSheetPicker>
    await mountSuspended(defineComponent({
      setup() {
        picker = useBeatSheetPicker(outline, async (...ops) => applied.push(...ops))
        return () => h('div')
      },
    }))
    expect(requests).toBe(0)
    picker.open.value = true
    await vi.waitFor(() => expect(picker.selectedId.value).toBe('duo'))
    expect(picker.folder.value).toBe('/ws/templates/beat-sheets')
    expect(picker.preview.value).toBe('Adds 1 beat. Existing acts and beats stay as they are.')
    picker.apply()
    expect(picker.open.value).toBe(false)
    expect(applied).toEqual([{ op: 'addBeat', id: expect.stringMatching(/^bt_/), actId: 'act_1', title: 'End', summary: 'Fin.', index: 1 }])
    outline.value = { notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_1', title: 'Start', summary: '', scenes: [] }, { id: 'bt_2', title: 'End', summary: '', scenes: [] }] }] }
    expect(picker.canApply.value).toBe(false)
    expect(picker.preview.value).toMatch(/^Nothing to add/)
  })
})
