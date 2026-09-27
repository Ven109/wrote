/** Markdown options passed to `UEditor` (and mirrored by the headless test editor). */
export const MARKDOWN_OPTIONS = { markedOptions: { gfm: true } } as const

/** Normalizes editor output for storage: no trailing whitespace, one final newline (empty stays empty). */
export function toStoredBody(markdown: string): string {
  const trimmed = markdown.trimEnd()
  return trimmed ? `${trimmed}\n` : ''
}

/** Whether two bodies differ in a way worth saving (ignores trailing whitespace). */
export function bodiesDiffer(a: string, b: string): boolean {
  return a.trimEnd() !== b.trimEnd()
}
