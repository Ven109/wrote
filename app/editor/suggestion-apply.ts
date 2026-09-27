import type { JSONContent } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'
import type { Suggestion } from '#shared/schemas/suggestion'
import { suggestionRange } from './extensions/ai-suggestions'
import { locateSuggestion } from './suggestion-anchor'

type ApplicableSuggestion = Pick<Suggestion, 'id' | 'kind' | 'find' | 'replace' | 'before' | 'after'>

/** Parses Markdown with the editor's own parser (so links, emphasis, … become real nodes). */
function parseBlocks(editor: Editor, markdown: string): JSONContent[] {
  return editor.markdown?.parse(markdown).content ?? [{ type: 'paragraph', content: markdown ? [{ type: 'text', text: markdown }] : [] }]
}

/**
 * Applies an accepted suggestion as a normal editor change – visible at once, undoable with ⌘Z and saved
 * by autosave like any typing. `text` is the author's edited version of the proposal. Returns `false`
 * when the passage can no longer be found (stale).
 */
export function applySuggestion(editor: Editor, suggestion: ApplicableSuggestion, text = suggestion.replace): boolean {
  const range = suggestionRange(editor.state, suggestion.id) ?? locateSuggestion(editor.state.doc, suggestion)
  if (!range) return false
  const blocks = parseBlocks(editor, text)
  if (suggestion.kind === 'insert') {
    const $end = editor.state.doc.resolve(range.to)
    return editor.chain().insertContentAt($end.after($end.depth), blocks).run()
  }
  if (!text.trim()) return editor.chain().deleteRange(range).run()
  const inline = blocks.length === 1 && blocks[0]!.type === 'paragraph'
  return editor.chain().insertContentAt(range, inline ? blocks[0]!.content ?? [] : blocks).run()
}
