import type { Node as PmNode } from '@tiptap/pm/model'
import type { Suggestion } from '#shared/schemas/suggestion'
import { locateAnchor, locateAnchorFuzzy, type TextRange } from '#shared/utils/text-anchor'

/** Stands for an atom node (wiki link, image) – one character per document position. */
const OPAQUE = '\uFFFC'
/** Separates textblocks in the flat document text. */
const BLOCK = '\u2029'

/** Collapses whitespace so Markdown line wrapping and editor spacing compare equal. */
function normalize(text: string): string {
  return text.replace(/[ \t\r]*\n[ \t\r]*\n\s*/g, BLOCK).replace(/[^\S\u2029]+/g, ' ')
}

/**
 * Markdown as it reads in the editor: wiki links and images are single atoms, inline markers and list or
 * quote prefixes disappear, links become their text, paragraphs become block separators.
 */
export function markdownToDocText(markdown: string): string {
  return normalize(markdown
    .replace(/!?\[\[[^\]]+\]\]/g, OPAQUE)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, OPAQUE)
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|`|\*|_)/g, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)]|>|#{1,6})\s+/gm, ''))
}

/** Proposed Markdown as plain text for display: link labels instead of atoms, paragraphs kept. */
export function markdownToDisplay(markdown: string): string {
  return markdownToDocText(markdown.replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target))
    .replace(/\u2029/g, '\n\n')
}

/** The document's text with a document position for every character (whitespace collapsed like `normalize`). */
export function docTextIndex(doc: PmNode): { text: string, positions: number[] } {
  let text = ''
  const positions: number[] = []
  const push = (char: string, pos: number) => {
    if (/\s/.test(char) && char !== BLOCK) {
      if (text.endsWith(' ') || text.endsWith(BLOCK) || !text) return
      char = ' '
    }
    text += char
    positions.push(pos)
  }
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true
    if (text) {
      if (text.endsWith(' ')) {
        text = text.slice(0, -1)
        positions.pop()
      }
      push(BLOCK, pos)
    }
    node.forEach((child, offset) => {
      const start = pos + 1 + offset
      if (child.isText) [...child.text!].forEach((char, i) => push(char, start + i))
      else push(OPAQUE, start)
    })
    return false
  })
  return { text, positions }
}

/**
 * Where a suggestion's passage is in the editor document, or `null` when it is gone (stale). `fuzzy` also
 * finds a passage that was edited since (comments and review findings – never for replacing text).
 */
export function locateSuggestion(doc: PmNode, suggestion: Pick<Suggestion, 'find' | 'before' | 'after'>, index = docTextIndex(doc), options: { fuzzy?: boolean } = {}): TextRange | null {
  const find = markdownToDocText(suggestion.find).trim()
  const locate = options.fuzzy ? locateAnchorFuzzy : locateAnchor
  const found = locate(index.text, find, { before: markdownToDocText(suggestion.before), after: markdownToDocText(suggestion.after) })
  if (!found) return null
  return { from: index.positions[found.from]!, to: index.positions[found.to - 1]! + 1 }
}
