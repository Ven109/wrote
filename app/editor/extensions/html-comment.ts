import { mergeAttributes, Node } from '@tiptap/core'

const COMMENT_BLOCK = /^<!--([\s\S]*?)-->[ \t]*(?:\n+|$)/

/**
 * A block-level HTML comment (`<!-- … -->`), kept as an atom so Markdown round-trips unchanged – e.g. the
 * `<!-- wrote:beat … -->` markers in `outline.md` or an author's own hidden notes. Shown muted, not editable.
 */
export const HtmlComment = Node.create({
  name: 'htmlComment',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return { text: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="html-comment"]', getAttrs: element => ({ text: element.getAttribute('data-text') ?? '' }) }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'html-comment', 'data-text': node.attrs.text, 'class': 'html-comment', 'contenteditable': 'false' }), `<!--${node.attrs.text}-->`]
  },

  markdownTokenizer: {
    name: 'htmlComment',
    level: 'block',
    start: (src: string) => src.indexOf('<!--'),
    tokenize(src: string) {
      const match = COMMENT_BLOCK.exec(src)
      return match ? { type: 'htmlComment', raw: match[0], text: match[1] } : undefined
    },
  },

  parseMarkdown(token) {
    return { type: 'htmlComment', attrs: { text: token.text } }
  },

  renderMarkdown(node) {
    return `<!--${node.attrs?.text ?? ''}-->`
  },
})
