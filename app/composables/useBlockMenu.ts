import type { DropdownMenuItem, EditorHandlers } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { aiMenuItems } from '~/editor/ai-actions'
import { blockPosAtCursor } from '~/editor/block-actions'
import { INLINE_AI_CONTEXT } from '~/editor/inline-ai-context'
import { blockMenuItems } from '~/editor/menus'

/**
 * State of the block menu (desktop drag-handle dropdown or mobile action sheet).
 * Items are built when the menu opens, because their enabled state depends on the current document.
 */
export function useBlockMenu(editor: MaybeRefOrGetter<Editor>, handlers: MaybeRefOrGetter<EditorHandlers>) {
  const open = ref(false)
  const pos = ref<number | null>(null)
  const items = shallowRef<DropdownMenuItem[][]>([])
  const ai = inject(INLINE_AI_CONTEXT, null)

  /** AI actions for the block (submenus stay in the ✦ menu, the action sheet has no nesting). */
  function aiItems(target: number): DropdownMenuItem[][] {
    if (!ai) return []
    const run = (action: Parameters<typeof ai.run>[1], param?: string) => {
      close()
      ai.run(toValue(editor), action, { kind: 'block', pos: target }, param)
    }
    const ask = () => {
      close()
      ai.ask(toValue(editor), { kind: 'block', pos: target })
    }
    return aiMenuItems(run, ask).map(group => group.filter(item => !item.children))
  }

  function close() {
    open.value = false
  }

  function openFor(target: number | null) {
    if (target == null) return
    pos.value = target
    items.value = [...blockMenuItems(toValue(editor), toValue(handlers), target, close), ...aiItems(target)]
    open.value = true
  }

  /** Opens the menu for the block that contains the cursor (document mode). */
  function openAtCursor() {
    openFor(blockPosAtCursor(toValue(editor)))
  }

  return { open, pos, items, openFor, openAtCursor, close }
}
