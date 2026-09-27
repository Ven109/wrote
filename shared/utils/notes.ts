const TITLE_MAX = 80

/** Splits quick-capture text into a title (first line, without Markdown heading marks) and a body. */
export function splitCapture(text: string): { title: string, body: string } {
  const [first = '', ...rest] = text.trim().split(/\r?\n/)
  const heading = first.replace(/^#{1,6}\s+/, '').trim()
  const title = heading.length > TITLE_MAX ? `${heading.slice(0, TITLE_MAX - 1).trimEnd()}…` : heading
  const overflow = heading.length > TITLE_MAX ? `${heading}\n\n` : ''
  const body = `${overflow}${rest.join('\n').trim()}`.trim()
  return { title: title || 'Untitled note', body: body ? `${body}\n` : '' }
}
