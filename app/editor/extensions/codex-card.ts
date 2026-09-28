import { mergeAttributes, Node } from '@tiptap/core'
import { formatDirectiveAttrs } from '#shared/utils/directives'
import { leafTokenizer } from './directive'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codexCard: { insertCodexCard: (id: string) => ReturnType }
  }
}

/** A card showing a codex entry (`::codex-card{id=cdx_…}`); it always shows the entry's current data. */
export const CodexCard = Node.create({
  name: 'codexCard',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return { id: { default: '', parseHTML: element => element.getAttribute('data-id') ?? '' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="codex-card"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'codex-card', 'data-id': node.attrs.id, 'class': 'wrote-codex-card', 'contenteditable': 'false' }), `Codex: ${node.attrs.id}`]
  },

  markdownTokenizer: leafTokenizer('codex-card', 'codexCard'),
  parseMarkdown: token => ({ type: 'codexCard', attrs: { id: token.attrs?.id ?? '' } }),
  renderMarkdown: node => `::codex-card${formatDirectiveAttrs({ id: node.attrs?.id ?? '' })}`,

  addCommands() {
    return {
      insertCodexCard: id => ({ commands }) => commands.insertContent({ type: this.name, attrs: { id } }),
    }
  },
})
