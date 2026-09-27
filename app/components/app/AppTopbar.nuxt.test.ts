import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import AppTopbar from './AppTopbar.vue'

describe('AppTopbar', () => {
  it('emits toggle events from its buttons', async () => {
    const wrapper = await mountSuspended(AppTopbar)
    await wrapper.get('[aria-label="Toggle sidebar"]').trigger('click')
    await wrapper.get('[aria-label="Toggle assistant"]').trigger('click')
    expect(wrapper.emitted('toggleSidebar')).toHaveLength(1)
    expect(wrapper.emitted('toggleAssistant')).toHaveLength(1)
  })
})
