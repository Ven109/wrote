import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import type { ContextOverrides, ContextSnapshot } from '#shared/schemas/context'
import { useContextDrawer } from './useContextDrawer'

const snapshot: ContextSnapshot = {
  id: 'ctx_abc', createdAt: '2026-09-27', feature: 'assistant', model: 'ollama:tiny', budget: 1000, used: 20, system: 'SYSTEM',
  items: [
    { id: 'style-guide', layer: 'pinned', kind: 'style-guide', title: 'Style guide', source: null, text: 'Past tense.', tokens: 5, pinned: false },
    { id: 'entry:scn_1', layer: 'local', kind: 'entry', title: 'Scene “A” (open)', source: null, text: 'Body', tokens: 15, pinned: false },
  ],
  omitted: [{ id: 'search:scn_2', layer: 'retrieved', kind: 'search', title: 'Search: B', source: null, tokens: 900, pinned: false, reason: 'budget' }],
}
registerEndpoint('/api/books/demo/context/ctx_abc', () => snapshot)

async function mountDrawer(initial: ContextOverrides = { pinned: [], removed: [] }) {
  const current = ref(initial)
  const rerun = vi.fn(async (next: ContextOverrides) => {
    current.value = next
  })
  let drawer!: ReturnType<typeof useContextDrawer>
  await mountSuspended(defineComponent({
    setup() {
      drawer = useContextDrawer('demo', { overrides: computed(() => current.value), rerun })
      return () => h('div')
    },
  }))
  return { drawer, rerun }
}

describe('useContextDrawer', () => {
  it('opens a snapshot grouped by layer with left-out items', async () => {
    const { drawer } = await mountDrawer()
    drawer.show('ctx_abc')
    expect(drawer.open.value).toBe(true)
    await vi.waitFor(() => expect(drawer.groups.value.map(group => group.label)).toEqual(['Always included', 'What you are working on']))
    expect(drawer.omitted.value.map(row => row.item.id)).toEqual(['search:scn_2'])
    expect(drawer.changed.value).toBe(false)
  })

  it('pins and removes items (mutually exclusive) and answers again with the changes', async () => {
    const { drawer, rerun } = await mountDrawer({ pinned: [], removed: ['style-guide'] })
    drawer.show('ctx_abc')
    await vi.waitFor(() => expect(drawer.groups.value).toHaveLength(2))
    expect(drawer.groups.value[0]!.rows[0]!.removed).toBe(true)
    drawer.togglePin('style-guide')
    drawer.togglePin('search:scn_2')
    drawer.toggleRemove('entry:scn_1')
    expect(drawer.changed.value).toBe(true)
    await drawer.rerun()
    expect(rerun).toHaveBeenCalledWith({ pinned: ['style-guide', 'search:scn_2'], removed: ['entry:scn_1'] })
    expect(drawer.open.value).toBe(false)
  })
})
