const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu

/** Counts words in plain text or Markdown, ignoring punctuation and markup. */
export function countWords(text: string): number {
  return text.match(WORD_PATTERN)?.length ?? 0
}
