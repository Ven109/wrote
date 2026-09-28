import type { JSONContent, MarkdownParseHelpers, MarkdownRendererHelpers, MarkdownToken } from '@tiptap/core'
import type { Node as PmNode } from '@tiptap/pm/model'
import { CONTAINER_DIRECTIVE, formatDirectiveAttrs, LEAF_DIRECTIVE, parseDirectiveAttrs } from '#shared/utils/directives'

/** Directive names Wrote handles; other directives round-trip untouched (`rawDirective`). */
export const KNOWN_DIRECTIVES = ['note', 'callout', 'codex-card']

/** Tokenizer for a container directive (`:::name{…}` … `:::`) whose inner Markdown becomes the node's blocks. */
export function containerTokenizer(directive: string, type: string) {
  return {
    name: type,
    level: 'block' as const,
    start: (src: string) => src.indexOf(`:::${directive}`),
    tokenize(src: string, _tokens: MarkdownToken[], lexer: { blockTokens: (src: string) => MarkdownToken[] }) {
      const match = CONTAINER_DIRECTIVE.exec(src)
      if (!match || match[1] !== directive) return undefined
      return { type, raw: match[0], attrs: parseDirectiveAttrs(match[2]), tokens: lexer.blockTokens(match[3] ?? '') }
    },
  }
}

/** Tokenizer for a leaf directive line (`::name{…}`). */
export function leafTokenizer(directive: string, type: string) {
  return {
    name: type,
    level: 'block' as const,
    start: (src: string) => src.indexOf(`::${directive}`),
    tokenize(src: string) {
      const match = LEAF_DIRECTIVE.exec(src)
      if (!match || match[1] !== directive) return undefined
      return { type, raw: match[0], attrs: parseDirectiveAttrs(match[2]) }
    },
  }
}

/** A container node from its token: its blocks, or one empty paragraph (containers need content). */
export function parseContainer(token: MarkdownToken, helpers: MarkdownParseHelpers, type: string, attrs: Record<string, unknown>): JSONContent {
  const parse = helpers.parseBlockChildren ?? helpers.parseChildren
  const children = parse(token.tokens ?? [])
  return helpers.createNode(type, attrs, children.length ? children : [helpers.createNode('paragraph')])
}

/** `:::name{attrs}` + the node's blocks separated by blank lines + `:::`. */
export function renderContainer(directive: string, attrs: Record<string, string | null | undefined>, node: JSONContent | PmNode, helpers: MarkdownRendererHelpers): string {
  const children = ((node as JSONContent).content ?? []) as JSONContent[]
  const inner = children.map(child => helpers.renderChildren([child])).join('\n\n')
  return `:::${directive}${formatDirectiveAttrs(attrs)}\n${inner}\n:::`
}
