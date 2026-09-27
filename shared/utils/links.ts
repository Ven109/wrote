export interface WikiLink {
  /** Link target as written: an entry id (`cdx_…`) or a title. */
  target: string
  label: string | null
}

const WIKI_LINK_SOURCE = String.raw`\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]`
const WIKI_LINK = new RegExp(WIKI_LINK_SOURCE, 'g')
const WIKI_LINK_AT_START = new RegExp(`^${WIKI_LINK_SOURCE}`)

function toLink(match: RegExpMatchArray): WikiLink {
  return { target: match[1]!.trim(), label: match[2]?.trim() || null }
}

/** Extracts `[[Target]]` and `[[Target|Label]]` links from Markdown. */
export function extractWikiLinks(markdown: string): WikiLink[] {
  return [...markdown.matchAll(WIKI_LINK)].map(toLink).filter(link => link.target.length > 0)
}

/** Matches a wiki link at the very start of `source` (for inline tokenizers). */
export function matchWikiLinkAt(source: string): { raw: string, link: WikiLink } | null {
  const match = WIKI_LINK_AT_START.exec(source)
  if (!match) return null
  const link = toLink(match)
  return link.target ? { raw: match[0], link } : null
}

/** Serializes a wiki link back to Markdown. */
export function formatWikiLink(link: WikiLink): string {
  return link.label ? `[[${link.target}|${link.label}]]` : `[[${link.target}]]`
}

/**
 * Rewrites links whose target equals `from` (case-insensitive) to point to `to`, keeping labels.
 * Returns the new Markdown and how many links changed.
 */
export function renameWikiLinks(markdown: string, from: string, to: string): { markdown: string, count: number } {
  const needle = from.trim().toLowerCase()
  let count = 0
  const next = markdown.replace(WIKI_LINK, (raw, target: string, label?: string) => {
    if (target.trim().toLowerCase() !== needle) return raw
    count++
    return formatWikiLink({ target: to, label: label?.trim() || null })
  })
  return { markdown: next, count }
}

/** Text around the first link to any of `names` (lower-case), for backlink previews. */
export function linkContext(markdown: string, names: string[], radius = 60): string | null {
  const wanted = new Set(names)
  for (const match of markdown.matchAll(WIKI_LINK)) {
    if (!wanted.has(match[1]!.trim().toLowerCase())) continue
    const start = Math.max(0, match.index! - radius)
    const end = Math.min(markdown.length, match.index! + match[0].length + radius)
    const text = markdown.slice(start, end).replace(/\s+/g, ' ').trim()
    return `${start > 0 ? '…' : ''}${text}${end < markdown.length ? '…' : ''}`
  }
  return null
}
