import type { CommandPaletteGroup, CommandPaletteItem } from '@nuxt/ui'
import { storeToRefs } from 'pinia'
import { useCommandsStore } from '~/stores/commands'

type CommandGroupSource = () => CommandPaletteGroup<CommandPaletteItem>

/**
 * Global ⌘K command palette. Features register groups of commands; the palette renders all of them.
 * Registration is scoped: groups registered inside a component are removed when it unmounts.
 */
export function useCommandPalette() {
  const store = useCommandsStore()
  const { open, groups } = storeToRefs(store)

  function registerGroup(id: string, source: CommandGroupSource) {
    store.register(id, source)
    if (getCurrentScope()) onScopeDispose(() => store.unregister(id))
  }

  return { open, groups, registerGroup, unregisterGroup: store.unregister }
}
