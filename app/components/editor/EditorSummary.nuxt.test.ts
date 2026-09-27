import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { Summary } from '#shared/schemas/summaries'
import EditorSummary from './EditorSummary.vue'

const summary: Summary = { entryId: 'scn_1', scope: 'scene', text: 'Mara arrives.', isManual: true, model: null, updatedAt: '2026-09-27' }
const props = { summary, enabled: true, editing: false, saving: false, draft: '' }

describe('EditorSummary', () => {
  it('shows a manual summary with its actions and emits them', async () => {
    const wrapper = await mountSuspended(EditorSummary, { props })
    expect(wrapper.text()).toContain('Mara arrives.')
    expect(wrapper.text()).toContain('Written by you')
    const click = (label: string) => wrapper.findAll('button').find(button => button.text() === label)!.trigger('click')
    await click('Edit')
    await click('Reset to automatic')
    await click('Use as synopsis')
    expect(Object.keys(wrapper.emitted())).toEqual(expect.arrayContaining(['edit', 'reset', 'synopsis']))
  })

  it('explains how summaries appear when there is none', async () => {
    const off = await mountSuspended(EditorSummary, { props: { ...props, summary: null, enabled: false } })
    expect(off.text()).toContain('turn on background summaries')
    expect(off.text()).toContain('Write summary')
    const on = await mountSuspended(EditorSummary, { props: { ...props, summary: null } })
    expect(on.text()).toContain('written in the background')
  })

  it('saves the draft from the edit form', async () => {
    const wrapper = await mountSuspended(EditorSummary, { props: { ...props, editing: true, draft: 'New text' } })
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('save')).toHaveLength(1)
  })
})
