const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu
/** Scripts written without spaces between words; counted per word segment (Intl.Segmenter). */
const UNSPACED_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u

function countSegmentedWords(text: string): number {
  let count = 0
  for (const segment of new Intl.Segmenter(undefined, { granularity: 'word' }).segment(text)) {
    if (segment.isWordLike) count++
  }
  return count
}

/**
 * Counts words in plain text or Markdown, ignoring punctuation and markup. Language-aware: text in
 * scripts without spaces (Chinese, Japanese, Thai, …) is segmented with `Intl.Segmenter`.
 * Shared by the server index and the live editor count, so both always agree.
 */
export function countWords(text: string): number {
  if (UNSPACED_SCRIPT.test(text) && typeof Intl.Segmenter === 'function') return countSegmentedWords(text)
  return text.match(WORD_PATTERN)?.length ?? 0
}
