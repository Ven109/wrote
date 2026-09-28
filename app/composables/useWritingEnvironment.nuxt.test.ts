import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { defineComponent, h, inject } from 'vue'
import { WRITING_MODES_CONTEXT, type WritingModesContext } from '~/editor/writing-modes-context'
import { useSessionTimerStore } from '~/stores/session-timer'
import { useWritingModesStore } from '~/stores/writing-modes'
import { isWriteRoute, useWritingEnvironment } from './useWritingEnvironment'

describe('isWriteRoute', () => {
  it.each([
    ['/books/novel/write', true],
    ['/books/novel/write/manuscript/01-scene.md', true],
    ['/books/novel/writer', false],
    ['/books/novel/notes', false],
    ['/', false],
  ])('%s → %s', (path, expected) => {
    expect(isWriteRoute(path)).toBe(expected)
  })
})

describe('useWritingEnvironment', () => {
  it('provides the modes to the editor and ends the session when the page goes away', async () => {
    let context: WritingModesContext | undefined
    let api!: ReturnType<typeof useWritingEnvironment>
    const Child = defineComponent({
      setup() {
        context = inject(WRITING_MODES_CONTEXT)
        return () => h('span')
      },
    })
    const wrapper = await mountSuspended(defineComponent({
      setup() {
        api = useWritingEnvironment(ref(''))
        return () => h(Child)
      },
    }))
    api.toggleFocus()
    expect(context?.focus.value).toBe(true)
    api.timer.start()
    useWritingModesStore().distractionFree = true
    wrapper.unmount()
    expect(useSessionTimerStore().timer.startedAt).toBeNull()
    expect(useWritingModesStore().distractionFree).toBe(false)
    useWritingModesStore().setPref('focus', false)
  })
})
