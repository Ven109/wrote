import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { defineStore } from 'pinia'

type CommandGroupSource = () => CommandPaletteGroup<CommandPaletteItem>

/** Command palette state: open flag and the groups registered by features. Per-request on the server. */
export const useCommandsStore = defineStore('commands', () => {
  const open = ref(false)
  const sources = shallowRef(new Map<string, CommandGroupSource>())
  const groups = computed(() => [...sources.value.values()].map(source => source()))

  function register(id: string, source: CommandGroupSource) {
    sources.value = new Map(sources.value).set(id, source)
  }

  function unregister(id: string) {
    const next = new Map(sources.value)
    next.delete(id)
    sources.value = next
  }

  return { open, groups, register, unregister }
})
