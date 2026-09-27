import { createHash } from 'node:crypto'

export interface Chunk {
  /** Position within the entry (0-based). */
  seq: number
  /** Heading the chunk sits under, if any. */
  heading: string | null
  /** Text sent to the embedding model: entry title, heading and the chunk's paragraphs. */
  text: string
  /** Content hash of `text`: unchanged chunks keep their hash, so they are never re-embedded. */
  hash: string
}

export interface ChunkOptions {
  /** Upper bound for one chunk's body (characters). Longer paragraphs are split at sentence ends. */
  maxChars?: number
  /** A group closes after a paragraph whose content hash is divisible by this (content-defined boundaries). */
  boundaryModulus?: number
}

const HEADING = /^#{1,6}\s+(.+?)\s*#*$/
const FENCE = /^(`{3,}|~{3,})/

/** Splits Markdown into blocks (paragraphs, lists, fenced code), keeping fences whole. */
export function markdownBlocks(markdown: string): string[] {
  const blocks: string[] = []
  let current: string[] = []
  let fence: string | null = null
  const flush = () => {
    const text = current.join('\n').trim()
    if (text) blocks.push(text)
    current = []
  }
  for (const line of markdown.split(/\r?\n/)) {
    const marker = line.trimStart().match(FENCE)?.[1]
    if (fence) {
      current.push(line)
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) {
        fence = null
        flush()
      }
      continue
    }
    if (marker) {
      flush()
      fence = marker
      current.push(line)
    }
    else if (!line.trim()) flush()
    else if (HEADING.test(line.trim())) {
      flush()
      blocks.push(line.trim())
    }
    else current.push(line)
  }
  flush()
  return blocks
}

/** Plain text for embedding: wiki links become their label, inline Markdown markers are dropped. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+))?\]\]/g, (_, target: string, label?: string) => label ?? target)
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/^\s{0,3}(?:[-*+]|\d+[.)]|>)\s+/gm, '')
    .trim()
}

function splitLong(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text]
  const sentences = text.match(/[^.!?…]+(?:[.!?…]+["'”’)]*\s*|$)/g) ?? [text]
  const parts: string[] = []
  let part = ''
  for (const sentence of sentences) {
    if (part && part.length + sentence.length > maxChars) {
      parts.push(part.trim())
      part = ''
    }
    // A single sentence above the limit is cut hard; its remainder starts the next part.
    let rest = sentence
    while (rest.length > maxChars) {
      parts.push(rest.slice(0, maxChars).trim())
      rest = rest.slice(maxChars)
    }
    part += rest
  }
  if (part.trim()) parts.push(part.trim())
  return parts
}

const sha1 = (text: string) => createHash('sha1').update(text).digest('hex')

/** Whether a paragraph ends its group – depends only on the paragraph itself, so edits never shift other groups. */
const isBoundary = (paragraph: string, modulus: number) => Number.parseInt(sha1(paragraph).slice(0, 8), 16) % modulus === 0

/**
 * Splits an entry into chunks for embedding. Paragraphs are grouped under their heading; a group ends at
 * a heading, at a content-defined boundary paragraph or when it would exceed `maxChars`. Because
 * boundaries depend on paragraph content (not on position or running length), editing one paragraph
 * changes only the chunk that contains it.
 */
export function chunkMarkdown(title: string, markdown: string, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 1500
  const modulus = options.boundaryModulus ?? 3
  const chunks: Chunk[] = []
  let heading: string | null = null
  let group: string[] = []
  const close = () => {
    if (!group.length) return
    const body = group.join('\n\n')
    const text = `${[title, heading].filter(Boolean).join(' › ')}\n\n${body}`
    chunks.push({ seq: chunks.length, heading, text, hash: sha1(text) })
    group = []
  }
  for (const block of markdownBlocks(markdown)) {
    const headingText = block.match(HEADING)?.[1]
    if (headingText) {
      close()
      heading = plainText(headingText)
      continue
    }
    for (const paragraph of splitLong(plainText(block), maxChars)) {
      if (!paragraph) continue
      if (group.length && [...group, paragraph].join('\n\n').length > maxChars) close()
      group.push(paragraph)
      if (isBoundary(paragraph, modulus)) close()
    }
  }
  close()
  return chunks
}
