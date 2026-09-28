import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EditorDistractionFreeBar from './EditorDistractionFreeBar.vue'

describe('EditorDistractionFreeBar', () => {
  it('offers a tap target to leave distraction-free mode', async () => {
    const wrapper = await mountSuspended(EditorDistractionFreeBar)
    await wrapper.get('button[aria-label="Exit distraction-free mode"]').trigger('click')
    expect(wrapper.emitted('exit')).toHaveLength(1)
  })
})
