import type { DropdownMenuItem, EditorCustomHandlers, EditorSuggestionMenuItem } from '@nuxt/ui'
import { INLINE_ACTION_LABELS, LANGUAGES, TONES, type InlineAction } from '#shared/schemas/inline-ai'
import { blockPosAtCursor } from './block-actions'
import type { InlineAiContext } from './inline-ai-context'

export const AI_ACTION_ICONS: Record<InlineAction, string> = {
  continue: 'i-lucide-pen-line',
  rephrase: 'i-lucide-refresh-cw',
  expand: 'i-lucide-unfold-vertical',
  tighten: 'i-lucide-fold-vertical',
  show: 'i-lucide-eye',
  tone: 'i-lucide-palette',
  translate: 'i-lucide-languages',
  custom: 'i-lucide-sparkles',
}

const SIMPLE_ACTIONS: InlineAction[] = ['continue', 'rephrase', 'expand', 'tighten', 'show']

/**
 * The AI actions as menu items (bubble toolbar, block menu, mobile sheet). Tone and language are submenus;
 * "Ask AI…" opens the prompt. `run` receives the action and its parameter.
 */
export function aiMenuItems(run: (action: InlineAction, param?: string) => void, ask: () => void): DropdownMenuItem[][] {
  const item = (action: InlineAction): DropdownMenuItem => ({ label: INLINE_ACTION_LABELS[action], icon: AI_ACTION_ICONS[action], onSelect: () => run(action) })
  return [
    [{ type: 'label', label: 'AI' }, ...SIMPLE_ACTIONS.map(item)],
    [
      { label: INLINE_ACTION_LABELS.tone, icon: AI_ACTION_ICONS.tone, children: TONES.map(tone => ({ label: tone[0]!.toUpperCase() + tone.slice(1), onSelect: () => run('tone', tone) })) },
      { label: INLINE_ACTION_LABELS.translate, icon: AI_ACTION_ICONS.translate, children: LANGUAGES.map(language => ({ label: language, onSelect: () => run('translate', language) })) },
      { label: `${INLINE_ACTION_LABELS.custom}…`, icon: AI_ACTION_ICONS.custom, onSelect: ask },
    ],
  ]
}

/** Slash menu (`/`) entries: AI actions on the block at the cursor. */
export const SLASH_AI_ITEMS: EditorSuggestionMenuItem[] = [
  { type: 'label', label: 'AI' },
  ...(['continue', 'rephrase', 'tighten', 'expand'] as const).map(action => ({ kind: 'aiAction', action, label: INLINE_ACTION_LABELS[action], icon: AI_ACTION_ICONS[action] })),
  { kind: 'aiAction', action: 'custom', label: `${INLINE_ACTION_LABELS.custom}…`, description: 'Your own instruction', icon: AI_ACTION_ICONS.custom },
]

/** Editor handler for slash items `kind: 'aiAction'`: runs the action on the block at the cursor. */
export function inlineAiHandlers(context: InlineAiContext): EditorCustomHandlers {
  return {
    aiAction: {
      canExecute: () => true,
      execute: (editor, item: { action?: InlineAction }) => {
        const pos = blockPosAtCursor(editor)
        if (pos !== null && item?.action) {
          if (item.action === 'custom') context.ask(editor, { kind: 'block', pos })
          else context.run(editor, item.action, { kind: 'block', pos })
        }
        return editor.chain()
      },
      isActive: () => false,
    },
  }
}
