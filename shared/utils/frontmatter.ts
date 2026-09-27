import { parseDocument, stringify } from 'yaml'

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export interface MarkdownFile {
  data: Record<string, unknown>
  body: string
}

/** Splits a Markdown file into YAML frontmatter data and body. */
export function parseMarkdownFile(source: string): MarkdownFile {
  const match = FRONTMATTER.exec(source)
  if (!match) return { data: {}, body: source }
  const doc = parseDocument(match[1]!)
  if (doc.errors.length) throw new Error(`Invalid frontmatter: ${doc.errors[0]!.message}`)
  const data = doc.toJS() ?? {}
  if (typeof data !== 'object' || Array.isArray(data)) throw new Error('Frontmatter must be a YAML mapping')
  return { data: data as Record<string, unknown>, body: source.slice(match[0].length) }
}

/** Serializes data + body back into a Markdown file. Key order of `data` is preserved. */
export function stringifyMarkdownFile({ data, body }: MarkdownFile): string {
  const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  if (!Object.keys(defined).length) return body
  const yaml = stringify(defined, { lineWidth: 0 }).trimEnd()
  return `---\n${yaml}\n---\n${body}`
}
