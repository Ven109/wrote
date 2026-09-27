export interface WikiLink {
  /** Link target as written: an entry id (`cdx_…`) or a title. */
  target: string
  label: string | null
}

const WIKI_LINK = /\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/g

/** Extracts `[[Target]]` and `[[Target|Label]]` links from Markdown. */
export function extractWikiLinks(markdown: string): WikiLink[] {
  return [...markdown.matchAll(WIKI_LINK)]
    .map(match => ({ target: match[1]!.trim(), label: match[2]?.trim() || null }))
    .filter(link => link.target.length > 0)
}
