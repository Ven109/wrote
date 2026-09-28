/**
 * Markdown directives for Wrote's custom blocks: containers (`:::note{todo=open}` … `:::`) and leaves
 * (`::codex-card{id=cdx_…}`). Attributes are `key=value`, `key="value with spaces"` or a bare `key`.
 */
export type DirectiveAttrs = Record<string, string>

/** A container directive at the start of `src`: name, attributes, inner Markdown and the raw text matched. */
export const CONTAINER_DIRECTIVE = /^:::([a-z][\w-]*)(\{[^}\n]*\})?[ \t]*\n(?:([\s\S]*?)\n)?:::[ \t]*(?:\n+|$)/
/** A leaf directive line at the start of `src`. */
export const LEAF_DIRECTIVE = /^::([a-z][\w-]*)(\{[^}\n]*\})?[ \t]*(?:\n+|$)/

export function parseDirectiveAttrs(source: string | undefined): DirectiveAttrs {
  const attrs: DirectiveAttrs = {}
  for (const match of (source ?? '').replace(/^\{|\}$/g, '').matchAll(/([\w-]+)(?:=(?:"([^"]*)"|(\S+)))?/g)) attrs[match[1]!] = match[2] ?? match[3] ?? ''
  return attrs
}

/** `{key=value …}` in a stable order (keys as given); empty values write a bare key, `null` is left out. */
export function formatDirectiveAttrs(attrs: Record<string, string | null | undefined>): string {
  const parts = Object.entries(attrs).filter((entry): entry is [string, string] => entry[1] !== null && entry[1] !== undefined)
    .map(([key, value]) => (value === '' ? key : /^[^\s"{}]+$/.test(value) ? `${key}=${value}` : `${key}="${value.replace(/"/g, '\'')}"`))
  return parts.length ? `{${parts.join(' ')}}` : ''
}

/** What export does with a block type: keep it (the exporter renders it) or leave it out. */
export type BlockExport = 'include' | 'strip'

/** Default export handling per custom block: working notes and codex cards stay out of the book. */
export const DEFAULT_BLOCK_EXPORT: Record<string, BlockExport> = { 'note': 'strip', 'callout': 'include', 'codex-card': 'strip', 'scene-break': 'include' }

/** The book's export handling per block type: its overrides on top of the defaults. */
export function blockExportPolicy(overrides: Record<string, BlockExport> = {}): Record<string, BlockExport> {
  return { ...DEFAULT_BLOCK_EXPORT, ...overrides }
}

/**
 * Removes the custom blocks export should leave out (per block type; unknown directives are kept). Line-based,
 * so fenced code that merely shows a directive is left alone.
 */
export function stripBlocksForExport(markdown: string, policy: Record<string, BlockExport> = DEFAULT_BLOCK_EXPORT): string {
  const lines = markdown.split('\n')
  const out: string[] = []
  let fence: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const fenceMatch = /^(`{3,}|~{3,})/.exec(line)
    if (fenceMatch) fence = fence === null ? fenceMatch[1]! : line.startsWith(fence) ? null : fence
    if (fence !== null || fenceMatch) {
      out.push(line)
      continue
    }
    const container = /^:::([a-z][\w-]*)/.exec(line)
    if (container && policy[container[1]!] === 'strip') {
      while (i < lines.length && !/^:::[ \t]*$/.test(lines[i + 1] ?? ':::')) i++
      i++
      continue
    }
    const leaf = /^::([a-z][\w-]*)/.exec(line)
    if (leaf && !line.startsWith(':::') && policy[leaf[1]!] === 'strip') continue
    if (/^\* \* \*[ \t]*$/.test(line) && policy['scene-break'] === 'strip') continue
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n')
}
