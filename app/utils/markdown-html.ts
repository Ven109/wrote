import DOMPurify from 'dompurify'
import { marked } from 'marked'

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`)

/**
 * Renders model output (untrusted Markdown) to sanitized HTML. Without a DOM (SSR) it falls back
 * to escaped plain text; chat messages render on the client.
 */
export function renderMarkdown(markdown: string): string {
  if (typeof window === 'undefined') return `<p>${escapeHtml(markdown)}</p>`
  const html = marked.parse(markdown, { async: false, gfm: true, breaks: true })
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'form', 'input'], FORBID_ATTR: ['style'] })
}
