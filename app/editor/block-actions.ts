import type { Editor } from '@tiptap/vue-3'
import type { EditorHandlers } from '@nuxt/ui'

type HandlerKind = keyof EditorHandlers

/** A block-level action. Shared by the desktop block menu and the mobile action sheet. */
export interface BlockAction {
  id: string
  label: string
  icon: string
  kind: HandlerKind
  /** Changes the block type (applied at the block's text) rather than acting on the whole node. */
  turnInto?: boolean
  level?: 1 | 2 | 3
  kbds?: string[]
  color?: 'error'
}

export const TURN_INTO_ACTIONS: BlockAction[] = [
  { id: 'paragraph', label: 'Text', icon: 'i-lucide-type', kind: 'paragraph', turnInto: true },
  { id: 'heading-1', label: 'Heading 1', icon: 'i-lucide-heading-1', kind: 'heading', level: 1, turnInto: true },
  { id: 'heading-2', label: 'Heading 2', icon: 'i-lucide-heading-2', kind: 'heading', level: 2, turnInto: true },
  { id: 'heading-3', label: 'Heading 3', icon: 'i-lucide-heading-3', kind: 'heading', level: 3, turnInto: true },
  { id: 'bullet-list', label: 'Bullet list', icon: 'i-lucide-list', kind: 'bulletList', turnInto: true },
  { id: 'ordered-list', label: 'Numbered list', icon: 'i-lucide-list-ordered', kind: 'orderedList', turnInto: true },
  { id: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote', kind: 'blockquote', turnInto: true },
  { id: 'code-block', label: 'Code block', icon: 'i-lucide-square-code', kind: 'codeBlock', turnInto: true },
]

export const NODE_ACTIONS: BlockAction[] = [
  { id: 'move-up', label: 'Move up', icon: 'i-lucide-arrow-up', kind: 'moveUp', kbds: ['alt', 'arrowup'] },
  { id: 'move-down', label: 'Move down', icon: 'i-lucide-arrow-down', kind: 'moveDown', kbds: ['alt', 'arrowdown'] },
  { id: 'duplicate', label: 'Duplicate', icon: 'i-lucide-copy', kind: 'duplicate' },
  { id: 'delete', label: 'Delete', icon: 'i-lucide-trash', kind: 'delete', color: 'error' },
]

/** Position of the top-level block that contains the cursor, or `null` in an empty doc. */
export function blockPosAtCursor(editor: Editor): number | null {
  const { $from } = editor.state.selection
  if ($from.depth >= 1) return $from.before(1)
  return editor.state.doc.nodeAt($from.pos) ? $from.pos : null
}

function commandFor(action: BlockAction, pos: number) {
  return { kind: action.kind, pos, level: action.level }
}

export function canRunBlockAction(editor: Editor, handlers: EditorHandlers, action: BlockAction, pos: number): boolean {
  const handler = handlers[action.kind]
  const inDoc = pos >= 0 && pos < editor.state.doc.content.size
  if (!handler || !inDoc || !editor.state.doc.nodeAt(pos)) return false
  return action.turnInto ? true : handler.canExecute(editor, commandFor(action, pos))
}

/** Runs a block action on the block at `pos`. Turn-into actions first move the cursor into that block. */
export function runBlockAction(editor: Editor, handlers: EditorHandlers, action: BlockAction, pos: number): boolean {
  if (!canRunBlockAction(editor, handlers, action, pos)) return false
  if (action.turnInto) editor.chain().focus().setTextSelection(pos + 1).run()
  return handlers[action.kind]!.execute(editor, commandFor(action, pos)).run()
}
