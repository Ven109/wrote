import type { EditorCustomHandlers } from '@nuxt/ui'

/** Slash-menu handlers for Wrote's custom blocks (item `kind` → command). */
export const blockHandlers: EditorCustomHandlers = {
  noteBlock: { canExecute: () => true, execute: editor => editor.chain().focus().insertNote(), isActive: () => false },
  calloutBlock: { canExecute: () => true, execute: editor => editor.chain().focus().insertCallout('info'), isActive: () => false },
  codexCard: { canExecute: () => true, execute: editor => editor.chain().focus().insertCodexCard(''), isActive: () => false },
  sceneBreak: { canExecute: () => true, execute: editor => editor.chain().focus().insertSceneBreak(), isActive: () => false },
}
