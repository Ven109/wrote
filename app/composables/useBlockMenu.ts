import type { DropdownMenuItem, EditorHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { blockPosAtCursor } from '~/editor/block-actions'
import { blockMenuItems } from '~/editor/menus'

/**
 * State of the block menu (desktop drag-handle dropdown or mobile action sheet).
 * Items are built when the menu opens, because their enabled state depends on the current document.
 */
export function useBlockMenu(editor: MaybeRefOrGetter<Editor>, handlers: MaybeRefOrGetter<EditorHandlers>) {
  const open = ref(false)
  const pos = ref<number | null>(null)
  const items = shallowRef<DropdownMenuItem[][]>([])

  function close() {
    open.value = false
  }

  function openFor(target: number | null) {
    if (target == null) return
    pos.value = target
    items.value = blockMenuItems(toValue(editor), toValue(handlers), target, close)
    open.value = true
  }

  /** Opens the menu for the block that contains the cursor (document mode). */
  function openAtCursor() {
    openFor(blockPosAtCursor(toValue(editor)))
  }

  return { open, pos, items, openFor, openAtCursor, close }
}
