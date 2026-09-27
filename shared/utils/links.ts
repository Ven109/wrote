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
