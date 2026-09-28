import { mergeAttributes, Node } from '@tiptap/core'
import { containerTokenizer, parseContainer, renderContainer } from './directive'

export type NoteTodo = 'open' | 'done' | null

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteBlock: { insertNote: () => ReturnType }
  }
}

/**
 * An author's working note inside the text (`:::note{todo=open}` … `:::`), shown as an aside and left out of
 * exports by default. `todo` marks it as an open or done task.
 */
export const NoteBlock = Node.create({
  name: 'noteBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return { todo: { default: null as NoteTodo, parseHTML: element => element.getAttribute('data-todo') || null } }
  },

  parseHTML() {
    return [{ tag: 'aside[data-type="note"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes, { 'data-type': 'note', 'data-todo': node.attrs.todo ?? undefined, 'class': 'wrote-note' }), 0]
  },

  markdownTokenizer: containerTokenizer('note', 'noteBlock'),
  parseMarkdown: (token, helpers) => parseContainer(token, helpers, 'noteBlock', { todo: token.attrs?.todo || null }),
  renderMarkdown: (node, helpers) => renderContainer('note', { todo: node.attrs?.todo ?? null }, node, helpers),

  addCommands() {
    return {
      insertNote: () => ({ commands }) => commands.insertContent({ type: this.name, attrs: { todo: 'open' }, content: [{ type: 'paragraph' }] }),
    }
  },
})
