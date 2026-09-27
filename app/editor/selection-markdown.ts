import type { JSONContent } from '@tiptap/core'
import type { Editor } from '@tiptap/vue-3'

function serialize(editor: Editor, content: JSONContent[]): string {
  return (editor.markdown?.serialize({ type: 'doc', content }) ?? '').trim()
}

/** The selected text as Markdown, serialized like the saved body (so the server can find it). */
export function selectionMarkdown(editor: Editor): string {
  const { from, to, empty } = editor.state.selection
  if (empty) return ''
  const content = editor.state.doc.slice(from, to).content
  const json = content.toJSON() as JSONContent[]
  // A selection inside one paragraph is a run of inline nodes: serialize it as one paragraph.
  return serialize(editor, content.firstChild?.isInline ? [{ type: 'paragraph', content: json }] : json)
}

/** The block at `pos` as Markdown. */
export function blockMarkdown(editor: Editor, pos: number): string {
  const node = editor.state.doc.nodeAt(pos)
  return node ? serialize(editor, [node.toJSON() as JSONContent]) : ''
}

/** Position of the nearest block before `pos` that has text (e.g. to continue from an empty line). */
export function previousTextBlockPos(editor: Editor, pos: number): number | null {
  let found: number | null = null
  editor.state.doc.forEach((node, offset) => {
    if (offset < pos && node.textContent.trim()) found = offset
  })
  return found
}
