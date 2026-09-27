import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BaseEmptyState from './BaseEmptyState.vue'

describe('BaseEmptyState', () => {
  it('renders title, description and slot', async () => {
    const wrapper = await mountSuspended(BaseEmptyState, {
      props: { title: 'Nothing here', description: 'Add something' },
      slots: { default: () => 'Action' },
    })
    expect(wrapper.text()).toContain('Nothing here')
    expect(wrapper.text()).toContain('Add something')
    expect(wrapper.text()).toContain('Action')
  })
})
