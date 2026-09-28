import { parseDirectiveAttrs, stripBlocksForExport, type BlockExport } from '#shared/utils/directives'

/** Anchors of the entries in the export (for `[[links]]` between chapters and scenes). */
export interface LinkTargets {
  /** Entry id or lower-cased title → heading/scene anchor. */
  anchors: Map<string, string>
}

export interface PrepareOptions {
  policy: Record<string, BlockExport>
  /** Unique prefix for this text's footnote labels (footnotes of different scenes must not collide). */
  footnotePrefix: string
  links: LinkTargets
  /** Headings in the text are shifted below the chapter heading by this many levels. */
  headingShift: number
  /** Resolves a relative image path of this text (e.g. against its folder); `null` keeps it. */
  resolveImage?: (src: string) => string | null
}

/** Applies `fn` to the parts of a Markdown text outside fenced code blocks. */
export function outsideCode(markdown: string, fn: (text: string) => string): string {
  const parts = markdown.split(/(^(?:`{3,}|~{3,})[^\n]*\n[\s\S]*?^(?:`{3,}|~{3,})[ \t]*$)/m)
  return parts.map((part, index) => (index % 2 === 1 ? part : fn(part))).join('')
}

const pandocAttrs = (source: string | undefined) =>
  Object.entries(parseDirectiveAttrs(source)).map(([key, value]) => ` ${key}="${String(value).replace(/"/g, '&quot;')}"`).join('')

/** Kept container blocks become Pandoc fenced divs (`::: {.callout variant="tip"}`); leftover leaf directives are dropped. */
export function directivesToDivs(text: string): string {
  return text
    .replace(/^:::([a-z][\w-]*)(\{[^}\n]*\})?[ \t]*$/gm, (_, name: string, attrs?: string) => `::: {.${name}${pandocAttrs(attrs?.slice(1, -1))}}`)
    .replace(/^::(?!:)[a-z][\w-]*(\{[^}\n]*\})?[ \t]*\n?/gm, '')
}

/** `[[Target|Label]]` → a link to the entry's anchor when it is in the export, else just its text. */
export function resolveWikiLinks(text: string, links: LinkTargets): string {
  return text.replace(/\[\[([^[\]|\n]+?)(?:\|([^[\]\n]+?))?\]\]/g, (_, target: string, label?: string) => {
    const anchor = links.anchors.get(target.trim()) ?? links.anchors.get(target.trim().toLowerCase())
    const text = (label ?? target).trim()
    return anchor ? `[${text}](#${anchor})` : text
  })
}

/** Footnote labels get a per-text prefix: `[^1]` → `[^s2-1]` (references and definitions). */
export const prefixFootnotes = (text: string, prefix: string) => text.replace(/\[\^([^\]\s]+)\]/g, `[^${prefix}-$1]`)

/** Moves ATX headings down so a scene's `#` sits below its chapter heading (max level 6). */
export const shiftHeadings = (text: string, shift: number) =>
  shift ? text.replace(/^(#{1,6})(?=[ \t])/gm, hashes => '#'.repeat(Math.min(6, hashes.length + shift))) : text

/** Rewrites relative image sources (`![alt](images/map.png)`). */
export function resolveImages(text: string, resolve: (src: string) => string | null): string {
  return text.replace(/(!\[[^\]]*\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (whole, open: string, src: string, close: string) => {
    if (/^(?:[a-z]+:|\/|#)/i.test(src)) return whole
    const resolved = resolve(src)
    return resolved ? `${open}${resolved}${close}` : whole
  })
}

/**
 * Turns one entry's Markdown into export-ready Markdown: working blocks stripped (per the book's policy),
 * hidden `<!-- -->` notes removed, kept blocks as Pandoc divs, wiki links resolved, footnotes made unique,
 * headings nested under the chapter and image paths resolved. Fenced code is left untouched.
 */
export function prepareBody(markdown: string, options: PrepareOptions): string {
  const stripped = stripBlocksForExport(markdown, options.policy)
  const prepared = outsideCode(stripped, (text) => {
    let out = text.replace(/<!--[\s\S]*?-->\n?/g, '')
    out = directivesToDivs(out)
    out = resolveWikiLinks(out, options.links)
    out = prefixFootnotes(out, options.footnotePrefix)
    out = shiftHeadings(out, options.headingShift)
    return options.resolveImage ? resolveImages(out, options.resolveImage) : out
  })
  return prepared.replace(/\n{3,}/g, '\n\n').trim()
}
