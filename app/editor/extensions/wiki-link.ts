import { InputRule, mergeAttributes, Node } from '@tiptap/core'
import { formatWikiLink, matchWikiLinkAt } from '#shared/utils/links'

/**
 * Inline `[[Target]]` / `[[Target|Label]]` link, kept as an atom so Markdown round-trips unchanged.
 * Resolution, autocomplete and navigation come with the links feature.
 */
export const WikiLink = Node.create({
  name: 'wikiLink',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      target: { default: '' },
      label: { default: null },
    }
  },

  parseHTML() {
    return [{
      tag: 'span[data-type="wiki-link"]',
      getAttrs: element => ({ target: element.getAttribute('data-target') ?? '', label: element.getAttribute('data-label') }),
    }]
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = { 'data-type': 'wiki-link', 'data-target': node.attrs.target, 'data-label': node.attrs.label, 'class': 'wiki-link' }
    return ['span', mergeAttributes(HTMLAttributes, attrs), node.attrs.label ?? node.attrs.target]
  },

  addInputRules() {
    return [new InputRule({
      find: /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]$/,
      handler: ({ range, match, chain }) => {
        const target = match[1]?.trim()
        if (!target) return
        chain().deleteRange(range).insertContent({ type: this.name, attrs: { target, label: match[2]?.trim() || null } }).run()
      },
    })]
  },

  renderText({ node }) {
    return formatWikiLink({ target: node.attrs.target, label: node.attrs.label })
  },

  markdownTokenizer: {
    name: 'wikiLink',
    level: 'inline',
    start: (src: string) => src.indexOf('[['),
    tokenize(src: string) {
      const found = matchWikiLinkAt(src)
      if (!found) return undefined
      return { type: 'wikiLink', raw: found.raw, target: found.link.target, label: found.link.label }
    },
  },

  parseMarkdown(token) {
    return { type: 'wikiLink', attrs: { target: token.target, label: token.label } }
  },

  renderMarkdown(node) {
    return formatWikiLink({ target: node.attrs?.target ?? '', label: node.attrs?.label ?? null })
  },
})
