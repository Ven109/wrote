import { mergeAttributes, Node } from '@tiptap/core'
import { CONTAINER_DIRECTIVE, LEAF_DIRECTIVE } from '#shared/utils/directives'
import { KNOWN_DIRECTIVES } from './directive'

/**
 * A directive Wrote does not know (from another tool, or a future block type), kept verbatim as an atom so
 * saving never changes or drops it.
 */
export const RawDirective = Node.create({
  name: 'rawDirective',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return { raw: { default: '' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="raw-directive"]', getAttrs: element => ({ raw: element.getAttribute('data-raw') ?? '' }) }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'raw-directive', 'data-raw': node.attrs.raw, 'class': 'wrote-raw-directive', 'contenteditable': 'false' }), node.attrs.raw]
  },

  markdownTokenizer: {
    name: 'rawDirective',
    level: 'block',
    start: (src: string) => src.indexOf('::'),
    tokenize(src: string) {
      const match = CONTAINER_DIRECTIVE.exec(src) ?? LEAF_DIRECTIVE.exec(src)
      if (!match || KNOWN_DIRECTIVES.includes(match[1]!)) return undefined
      return { type: 'rawDirective', raw: match[0], text: match[0].trimEnd() }
    },
  },
  parseMarkdown: token => ({ type: 'rawDirective', attrs: { raw: token.text } }),
  renderMarkdown: node => String(node.attrs?.raw ?? ''),
})
