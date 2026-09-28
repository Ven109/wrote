import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BookConfig } from '#shared/schemas/book'
import type { ExportFormat } from '#shared/schemas/export'
import { BOOK_CSS, BOOK_TYP } from './templates'
import { runTool } from './tools'

export interface RenderInput {
  /** Compiled manuscript (no YAML header). */
  markdown: string
  config: BookConfig
  withParts: boolean
  /** Title page + table of contents. */
  frontMatter: boolean
  /** Book root: images and the cover (`cover.jpg` / `cover.png`) are resolved against it. */
  root: string
  signal?: AbortSignal
}

export const CONTENT_TYPES: Record<ExportFormat, string> = {
  epub: 'application/epub+zip',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  html: 'text/html; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
}

/** YAML metadata block (JSON is valid YAML, so values need no escaping rules of their own). */
export function metadataBlock(config: BookConfig, withTitle = true): string {
  const meta = { ...(withTitle ? { title: config.title, subtitle: config.subtitle, author: config.author } : { pagetitle: config.title }), lang: config.language }
  const lines = Object.entries(meta).filter(([, value]) => value).map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
  return `---\n${lines.join('\n')}\n---\n\n`
}

const coverOf = (root: string) => ['cover.jpg', 'cover.jpeg', 'cover.png'].map(name => join(root, name)).find(path => existsSync(path))

/** Pandoc arguments for a format (input `book.md` in the working directory). */
export function pandocArgs(format: Exclude<ExportFormat, 'md'>, input: Pick<RenderInput, 'withParts' | 'frontMatter' | 'root'>, output: string): string[] {
  const args = ['book.md', '--from', 'markdown', '--standalone', `--resource-path=.:${input.root}`, `--top-level-division=${input.withParts ? 'part' : 'chapter'}`, '-o', output]
  if (input.frontMatter && format !== 'pdf') args.push('--toc', `--toc-depth=${input.withParts ? 2 : 1}`)
  if (format === 'epub') {
    args.push(`--split-level=${input.withParts ? 2 : 1}`, '--css=book.css')
    if (!input.frontMatter) args.push('--epub-title-page=false')
    const cover = coverOf(input.root)
    if (cover) args.push(`--epub-cover-image=${cover}`)
  }
  if (format === 'html') args.push('--embed-resources', '--css=book.css')
  if (format === 'pdf') args.splice(args.indexOf('--standalone'), 1, '--to', 'typst')
  return args
}

/**
 * Pandoc writes a scene's label right after its chapter heading's label; Typst keeps one label per element.
 * Consecutive labels are merged into the first, and links to the dropped ones point at the kept one.
 */
export function mergeTypstLabels(body: string): string {
  const alias = new Map<string, string>()
  const out: string[] = []
  for (const line of body.split('\n')) {
    const label = /^<([\w-]+)>$/.exec(line)?.[1]
    const previous = /^<([\w-]+)>$/.exec(out.at(-1) ?? '')?.[1]
    if (label && previous) alias.set(label, alias.get(previous) ?? previous)
    else out.push(line)
  }
  return out.join('\n').replace(/#link\(<([\w-]+)>\)/g, (whole, label: string) => (alias.has(label) ? `#link(<${alias.get(label)}>)` : whole))
}

/** Typst arguments of the template's `book.with(...)`. */
function typstOptions(input: RenderInput): string {
  const str = (value: string | undefined) => (value ? JSON.stringify(value) : 'none')
  const { config } = input
  return `title: ${str(config.title)}, subtitle: ${str(config.subtitle)}, author: ${str(config.author)}, lang: ${JSON.stringify(config.language.slice(0, 2))}, toc: ${input.frontMatter}, titlepage: ${input.frontMatter}, parts: ${input.withParts}`
}

/**
 * Renders the compiled manuscript with Pandoc (EPUB, DOCX, HTML) or Pandoc → Typst (PDF) in a temporary
 * folder and returns the file. Markdown is returned as compiled (with a metadata header).
 */
export async function renderExport(format: ExportFormat, input: RenderInput): Promise<Buffer> {
  const document = metadataBlock(input.config, input.frontMatter || format === 'epub') + input.markdown
  if (format === 'md') return Buffer.from(document)
  const dir = await mkdtemp(join(tmpdir(), 'wrote-export-'))
  try {
    await Promise.all([writeFile(join(dir, 'book.md'), document), writeFile(join(dir, 'book.css'), BOOK_CSS)])
    const options = { cwd: dir, signal: input.signal }
    if (format !== 'pdf') {
      await runTool('pandoc', pandocArgs(format, input, `book.${format}`), options)
      return await readFile(join(dir, `book.${format}`))
    }
    await runTool('pandoc', pandocArgs('pdf', input, 'body.typ'), options)
    const body = mergeTypstLabels(await readFile(join(dir, 'body.typ'), 'utf8'))
    await writeFile(join(dir, 'book.typ'), BOOK_TYP)
    await writeFile(join(dir, 'main.typ'), `#import "book.typ": *\n#show: book.with(${typstOptions(input)})\n\n${body}`)
    await runTool('typst', ['compile', '--root', '/', 'main.typ', 'book.pdf'], options)
    return await readFile(join(dir, 'book.pdf'))
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}
