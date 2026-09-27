import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EditorSaveStatus from './EditorSaveStatus.vue'

describe('EditorSaveStatus', () => {
  it('shows the saving state', async () => {
    const wrapper = await mountSuspended(EditorSaveStatus, { props: { status: 'saving' } })
    expect(wrapper.text()).toContain('Saving…')
  })

  it('offers a retry when saving failed', async () => {
    const wrapper = await mountSuspended(EditorSaveStatus, { props: { status: 'error' } })
    await wrapper.get('button[aria-label="Retry saving"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('offers conflict resolution', async () => {
    const wrapper = await mountSuspended(EditorSaveStatus, { props: { status: 'conflict' } })
    expect(wrapper.get('button[aria-label="Resolve save conflict"]').text()).toContain('Conflict')
  })
})
