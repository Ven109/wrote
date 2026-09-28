import { beforeEach, describe, expect, it } from 'vitest'
import { useWritingModesStore } from '~/stores/writing-modes'
import { useWritingModes } from './useWritingModes'

beforeEach(() => {
  const store = useWritingModesStore()
  store.setPref('focus', false)
  store.setPref('focusScope', 'paragraph')
  store.setPref('typewriter', false)
  store.setPref('timer', false)
  store.distractionFree = false
})

describe('useWritingModes', () => {
  it('starts with every mode off and focus by paragraph', () => {
    const modes = useWritingModes()
    expect([modes.focus.value, modes.typewriter.value, modes.timerVisible.value, modes.distractionFree.value]).toEqual([false, false, false, false])
    expect(modes.focusScope.value).toBe('paragraph')
  })

  it('toggles focus, its scope, typewriter and the timer and remembers them', async () => {
    const modes = useWritingModes()
    modes.toggleFocus()
    modes.toggleFocusScope()
    modes.toggleTypewriter()
    modes.setTimerVisible(true)
    expect(useWritingModesStore().prefs).toEqual({ focus: true, focusScope: 'sentence', typewriter: true, timer: true })
    await nextTick()
    expect(decodeURIComponent(document.cookie)).toContain('"focusScope":"sentence"')
  })

  it('shares state between callers', () => {
    useWritingModes().toggleTypewriter()
    expect(useWritingModes().typewriter.value).toBe(true)
  })
})
