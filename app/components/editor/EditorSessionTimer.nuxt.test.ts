import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import EditorSessionTimer from './EditorSessionTimer.vue'

const props = { label: '4:05', spoken: '4 minutes 5 seconds', running: false, durationMinutes: null }

describe('EditorSessionTimer', () => {
  it('shows the time and starts or pauses on click', async () => {
    const wrapper = await mountSuspended(EditorSessionTimer, { props })
    const button = wrapper.get('button[aria-label="Start session timer, 4 minutes 5 seconds"]')
    expect(button.text()).toContain('4:05')
    await button.trigger('click')
    expect(wrapper.emitted('toggle')).toHaveLength(1)
  })

  it('labels the button as pause while running', async () => {
    const wrapper = await mountSuspended(EditorSessionTimer, { props: { ...props, running: true } })
    expect(wrapper.find('button[aria-label^="Pause session timer"]').exists()).toBe(true)
  })
})
