import type { CommandPaletteItem } from '@nuxt/ui'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { useWritingModesStore } from '~/stores/writing-modes'
import { useWritingModeCommands } from './useWritingModeCommands'

const actions = { toggleDistractionFree: vi.fn(), toggleTimer: vi.fn() }

async function mountCommands() {
  let api!: ReturnType<typeof useWritingModeCommands>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      api = useWritingModeCommands(actions, ref(false))
      return () => h('div')
    },
  }))
  return { api, wrapper }
}

const paletteItems = () => (useCommandPalette().groups.value.find(group => group.id === 'writing-modes')?.items ?? []) as CommandPaletteItem[]
const select = (label: string) => paletteItems().find(item => item.label === label)?.onSelect?.(new Event('select'))
const press = (key: string) => window.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, shiftKey: true }))

beforeEach(() => {
  const store = useWritingModesStore()
  store.setPref('focus', false)
  store.setPref('typewriter', false)
  store.setPref('focusScope', 'paragraph')
  vi.clearAllMocks()
})

describe('useWritingModeCommands', () => {
  it('registers every mode in the ⌘K palette with its shortcut and state', async () => {
    const { wrapper } = await mountCommands()
    expect(paletteItems().map(item => item.label)).toEqual(['Distraction-free mode', 'Focus mode', 'Focus on the sentence', 'Typewriter scrolling', 'Session timer', 'Start session timer'])
    expect(paletteItems().find(item => item.label === 'Focus mode')).toMatchObject({ kbds: ['meta', 'shift', 'o'], suffix: 'Off' })
    wrapper.unmount()
    expect(paletteItems()).toEqual([])
  })

  it('toggles modes from the palette', async () => {
    const { wrapper } = await mountCommands()
    select('Focus mode')
    select('Focus on the sentence')
    select('Distraction-free mode')
    expect(useWritingModesStore().prefs).toMatchObject({ focus: true, focusScope: 'sentence' })
    expect(actions.toggleDistractionFree).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('toggles modes with their keyboard shortcuts', async () => {
    const { wrapper } = await mountCommands()
    press('o')
    press('y')
    press('f')
    expect(useWritingModesStore().prefs).toMatchObject({ focus: true, typewriter: true })
    expect(actions.toggleDistractionFree).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('offers the same toggles as a checkbox menu', async () => {
    const { api, wrapper } = await mountCommands()
    useWritingModesStore().setPref('typewriter', true)
    expect(api.menu.value.find(item => item.label === 'Typewriter scrolling')).toMatchObject({ type: 'checkbox', checked: true })
    wrapper.unmount()
  })
})
