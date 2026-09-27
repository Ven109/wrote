import type { DropdownMenuItem, EditorHandlers, EditorSuggestionMenuItem, EditorToolbarItem } from '@nuxt/ui'
import type { Editor } from '@tiptap/vue-3'
import { canRunBlockAction, NODE_ACTIONS, runBlockAction, TURN_INTO_ACTIONS, type BlockAction } from './block-actions'

/** Slash menu (`/`): insertable blocks. */
export const SLASH_ITEMS: EditorSuggestionMenuItem[][] = [[
  { type: 'label', label: 'Text' },
  { kind: 'paragraph', label: 'Text', icon: 'i-lucide-type' },
  { kind: 'heading', level: 1, label: 'Heading 1', icon: 'i-lucide-heading-1' },
  { kind: 'heading', level: 2, label: 'Heading 2', icon: 'i-lucide-heading-2' },
  { kind: 'heading', level: 3, label: 'Heading 3', icon: 'i-lucide-heading-3' },
], [
  { type: 'label', label: 'Blocks' },
  { kind: 'bulletList', label: 'Bullet list', icon: 'i-lucide-list' },
  { kind: 'orderedList', label: 'Numbered list', icon: 'i-lucide-list-ordered' },
  { kind: 'blockquote', label: 'Quote', icon: 'i-lucide-text-quote' },
  { kind: 'codeBlock', label: 'Code block', icon: 'i-lucide-square-code' },
  { kind: 'horizontalRule', label: 'Scene break', description: 'Divider between beats', icon: 'i-lucide-separator-horizontal' },
]]

/** Inline formatting shared by the bubble toolbar (desktop) and the bottom toolbar (mobile). */
export const FORMAT_ITEMS: EditorToolbarItem[] = [
  { 'kind': 'mark', 'mark': 'bold', 'icon': 'i-lucide-bold', 'aria-label': 'Bold', 'tooltip': { text: 'Bold', kbds: ['meta', 'b'] } },
  { 'kind': 'mark', 'mark': 'italic', 'icon': 'i-lucide-italic', 'aria-label': 'Italic', 'tooltip': { text: 'Italic', kbds: ['meta', 'i'] } },
  { 'kind': 'mark', 'mark': 'strike', 'icon': 'i-lucide-strikethrough', 'aria-label': 'Strikethrough', 'tooltip': { text: 'Strikethrough' } },
  { 'kind': 'mark', 'mark': 'code', 'icon': 'i-lucide-code', 'aria-label': 'Inline code', 'tooltip': { text: 'Code', kbds: ['meta', 'e'] } },
]

/** Mobile-only extras: insert (opens the slash menu), undo and redo. */
export const MOBILE_TOOLBAR_ITEMS: EditorToolbarItem[][] = [
  [{ 'kind': 'suggestion', 'icon': 'i-lucide-plus', 'aria-label': 'Insert block' }],
  FORMAT_ITEMS,
  [
    { 'kind': 'undo', 'icon': 'i-lucide-undo', 'aria-label': 'Undo' },
    { 'kind': 'redo', 'icon': 'i-lucide-redo', 'aria-label': 'Redo' },
  ],
]

function toMenuItem(editor: Editor, handlers: EditorHandlers, action: BlockAction, pos: number, onDone?: () => void): DropdownMenuItem {
  return {
    label: action.label,
    icon: action.icon,
    kbds: action.kbds,
    color: action.color,
    disabled: !canRunBlockAction(editor, handlers, action, pos),
    onSelect: () => {
      runBlockAction(editor, handlers, action, pos)
      onDone?.()
    },
  }
}

/** Block menu for the block at `pos`: "Turn into" plus move/duplicate/delete. Same items in both modes. */
export function blockMenuItems(editor: Editor, handlers: EditorHandlers, pos: number, onDone?: () => void): DropdownMenuItem[][] {
  return [
    [{ type: 'label', label: 'Turn into' }, ...TURN_INTO_ACTIONS.map(action => toMenuItem(editor, handlers, action, pos, onDone))],
    NODE_ACTIONS.map(action => toMenuItem(editor, handlers, action, pos, onDone)),
  ]
}
