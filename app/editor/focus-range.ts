import type { Node as PmNode } from '@tiptap/pm/model'

/** Placeholder for inline non-text nodes (wiki links, images, hard breaks): one character per position. */
const OBJECT = '￼'

/** The text of a textblock with exactly one character per document position, so offsets map 1:1. */
export function inlineText(block: PmNode): string {
  let text = ''
  block.forEach((child) => {
    text += child.isText ? child.text ?? '' : OBJECT.repeat(child.nodeSize)
  })
  return text
}

function sentences(text: string): { index: number, segment: string }[] {
  if (typeof Intl.Segmenter === 'function') return [...new Intl.Segmenter(undefined, { granularity: 'sentence' }).segment(text)]
  const parts: { index: number, segment: string }[] = []
  for (const match of text.matchAll(/[^.!?…]*(?:[.!?…]+["'”’)\]]*\s*|$)/g)) {
    if (match[0]) parts.push({ index: match.index, segment: match[0] })
  }
  return parts
}

/**
 * Bounds of the sentence containing `offset` in `text` (trailing spaces excluded). A caret at the very start of
 * a sentence belongs to it; a caret right after a sentence's punctuation still belongs to that sentence.
 */
export function sentenceBounds(text: string, offset: number): { from: number, to: number } {
  const parts = sentences(text)
  const hit = parts.find(part => offset >= part.index && offset < part.index + part.segment.length) ?? parts.at(-1)
  if (!hit) return { from: 0, to: 0 }
  return { from: hit.index, to: hit.index + hit.segment.trimEnd().length }
}
