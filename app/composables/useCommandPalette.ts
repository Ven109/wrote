import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'

type CommandGroupSource = () => CommandPaletteGroup<CommandPaletteItem>

const sources = shallowRef(new Map<string, CommandGroupSource>())

/**
 * Global ⌘K command palette. Features register groups of commands; the palette renders all of them.
 * Registration is scoped: groups registered inside a component are removed when it unmounts.
 */
export function useCommandPalette() {
  const open = useState('command-palette-open', () => false)

  const groups = computed(() => [...sources.value.values()].map(source => source()))

  function registerGroup(id: string, source: CommandGroupSource) {
    sources.value = new Map(sources.value).set(id, source)
    if (getCurrentScope()) {
      onScopeDispose(() => unregisterGroup(id))
    }
  }

  function unregisterGroup(id: string) {
    const next = new Map(sources.value)
    next.delete(id)
    sources.value = next
  }

  return { open, groups, registerGroup, unregisterGroup }
}
