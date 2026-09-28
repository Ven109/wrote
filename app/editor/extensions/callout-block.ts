import { mergeAttributes, Node } from '@tiptap/core'
import { containerTokenizer, parseContainer, renderContainer } from './directive'

export const CALLOUT_VARIANTS = ['info', 'tip', 'warning'] as const
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number]

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    calloutBlock: { insertCallout: (variant?: CalloutVariant) => ReturnType }
  }
}

/** A highlighted box (`:::callout{variant=tip}` … `:::`) – for non-fiction asides; exported by default. */
export const CalloutBlock = Node.create({
  name: 'calloutBlock',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return { variant: { default: 'info' as CalloutVariant, parseHTML: element => element.getAttribute('data-variant') || 'info' } }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="callout"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'callout', 'data-variant': node.attrs.variant, 'class': `wrote-callout wrote-callout--${node.attrs.variant}` }), 0]
  },

  markdownTokenizer: containerTokenizer('callout', 'calloutBlock'),
  parseMarkdown: (token, helpers) => parseContainer(token, helpers, 'calloutBlock', { variant: CALLOUT_VARIANTS.includes(token.attrs?.variant) ? token.attrs.variant : 'info' }),
  renderMarkdown: (node, helpers) => renderContainer('callout', { variant: node.attrs?.variant ?? 'info' }, node, helpers),

  addCommands() {
    return {
      insertCallout: (variant = 'info') => ({ commands }) => commands.insertContent({ type: this.name, attrs: { variant }, content: [{ type: 'paragraph' }] }),
    }
  },
})
