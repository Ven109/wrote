import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { defineStore } from 'pinia'

type CommandGroupSource = () => CommandPaletteGroup<CommandPaletteItem>

/** Command palette state: open flag, search term and the groups registered by features. Per-request on the server. */
export const useCommandsStore = defineStore('commands', () => {
  const open = ref(false)
  /** What is typed into the palette – features like book search react to it. */
  const searchTerm = ref('')
  watch(open, (value) => {
    if (!value) searchTerm.value = ''
  })
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

  return { open, searchTerm, groups, register, unregister }
})
