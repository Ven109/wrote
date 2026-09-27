import { extractWikiLinks, formatWikiLink } from './links'

const LINKS_ONLY = /^(?:\[\[[^[\]\n]+\]\][ \t]*)+$/

/** Appends a `[[Title]]` link: to a trailing links-only paragraph if there is one, else as a new paragraph. */
export function appendWikiLink(markdown: string, title: string): string {
  const link = formatWikiLink({ target: title, label: null })
  const body = markdown.replace(/\s+$/, '')
  if (!body) return `${link}\n`
  const lastBreak = body.lastIndexOf('\n')
  const last = body.slice(lastBreak + 1)
  return LINKS_ONLY.test(last) ? `${body} ${link}\n` : `${body}\n\n${link}\n`
}

/** Link targets already in a note (lower-cased titles or ids). */
export const linkedTargets = (markdown: string) => new Set(extractWikiLinks(markdown).map(link => link.target.toLowerCase()))

/** Tags of similar notes, most frequent first, without the ones the note already has. */
export function rankTags(neighbours: string[][], existing: string[], max = 3): string[] {
  const have = new Set(existing.map(tag => tag.toLowerCase()))
  const counts = new Map<string, number>()
  for (const tags of neighbours) for (const tag of new Set(tags)) if (!have.has(tag.toLowerCase())) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([tag]) => tag)
}
