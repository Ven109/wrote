import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BookConfig } from '#shared/schemas/book'
import type { ExportFormat } from '#shared/schemas/export'
import type { ExportPreset } from '#shared/schemas/export-preset'
import { matterMarkdown, type BookMatter } from './matter'
import { approximateWords, manuscriptReferenceDocx } from './reference-docx'
import { bookCss, BOOK_TYP, MANUSCRIPT_TYP } from './templates'
import { runTool } from './tools'
import { mergeTypstLabels, typstBookOptions, typstString } from './typst'

export interface RenderInput {
  /** Compiled manuscript (no YAML header). */
  markdown: string
  config: BookConfig
  withParts: boolean
  words: number
  preset: ExportPreset
  matter: BookMatter
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
const surnameOf = (author = '') => author.trim().split(/\s+/).at(-1) || 'Author'

/** Pandoc arguments for a format (input `book.md` in the working directory). */
export function pandocArgs(format: Exclude<ExportFormat, 'md'>, input: { withParts: boolean, toc: boolean, titlePage: boolean, root: string }, output: string): string[] {
  const args = ['book.md', '--from', 'markdown', '--standalone', `--resource-path=.:${input.root}`, `--top-level-division=${input.withParts ? 'part' : 'chapter'}`, '-o', output]
  if (input.toc && format !== 'pdf') args.push('--toc', `--toc-depth=${input.withParts ? 2 : 1}`)
  if (format === 'epub') {
    args.push(`--split-level=${input.withParts ? 2 : 1}`, '--css=book.css')
    if (!input.titlePage) args.push('--epub-title-page=false')
    const cover = coverOf(input.root)
    if (cover) args.push(`--epub-cover-image=${cover}`)
  }
  if (format === 'html') args.push('--embed-resources', '--css=book.css')
  if (format === 'docx') args.push('--reference-doc=reference.docx')
  if (format === 'pdf') args.splice(args.indexOf('--standalone'), 1, '--to', 'typst')
  return args
}

/** The Markdown document Pandoc (or the Markdown export) gets: metadata, front matter, manuscript, back matter. */
export function pandocDocument(format: ExportFormat, input: RenderInput): string {
  const { matter, preset, config } = input
  if (format === 'docx' && preset.manuscript) {
    const titlePage = matter.title
      ? `::: {custom-style="Contact"}\n${config.author ?? ''}\\\nabout ${approximateWords(input.words)} words\n:::\n\n::: {custom-style="Title"}\n${config.title.toUpperCase()}\n:::\n\n::: {custom-style="Byline"}\nby ${config.author ?? ''}\n:::\n\n`
      : ''
    const body = input.markdown.replace(/^\* \* \*$/gm, `::: {custom-style="Scene Break"}\n${preset.sceneBreak.replace(/[#*_\\[\]]/g, '\\$&')}\n:::`)
    return metadataBlock(config, false) + titlePage + body
  }
  const level = input.withParts ? 2 : 1
  const parts = [matterMarkdown(matter.front, level), input.markdown, matterMarkdown(matter.back, level)].filter(Boolean)
  return metadataBlock(config, matter.title || format === 'epub') + parts.join('\n\n')
}

/** Typst source: template import, layout, front matter in preset order, manuscript body, back matter. */
async function typstDocument(input: RenderInput, dir: string, toTypst: (markdown: string) => Promise<string>): Promise<string> {
  const { config, preset, matter } = input
  const body = mergeTypstLabels(await toTypst(input.markdown))
  if (preset.manuscript) {
    await writeFile(join(dir, 'template.typ'), MANUSCRIPT_TYP)
    const options = `title: ${typstString(config.title)}, author: ${typstString(config.author ?? '')}, surname: ${typstString(surnameOf(config.author))}, words: ${typstString(approximateWords(input.words))}, lang: ${typstString(config.language.slice(0, 2))}, scene-break: ${typstString(preset.sceneBreak)}`
    return `#import "template.typ": *\n#show: manuscript.with(${options})\n\n${body}\n`
  }
  await writeFile(join(dir, 'template.typ'), BOOK_TYP)
  const front: string[] = []
  if (matter.title) front.push(`#titlepage(title: ${typstString(config.title)}, subtitle: ${config.subtitle ? typstString(config.subtitle) : 'none'}, author: ${config.author ? typstString(config.author) : 'none'})`)
  for (const section of matter.front) front.push(`#matterpage(${typstString(section.id)})[\n${await toTypst(section.markdown)}\n]`)
  if (matter.toc) front.push(`#contents(depth: ${input.withParts ? 2 : 1})`)
  const back = await Promise.all(matter.back.map(async section => `#backpage(${typstString(section.title)})[\n${await toTypst(section.markdown)}\n]`))
  return [
    '#import "template.typ": *',
    `#show: book.with(${typstBookOptions(input)})`,
    ...front,
    '#set page(numbering: "1", number-align: center)',
    '#counter(page).update(1)',
    body,
    ...back,
  ].join('\n\n')
}

/**
 * Renders the compiled manuscript with Pandoc (EPUB, DOCX, HTML) or Pandoc → Typst (PDF) in a temporary folder,
 * laid out by the export preset, and returns the file. Markdown is returned as compiled (with front/back matter).
 */
export async function renderExport(format: ExportFormat, input: RenderInput): Promise<Buffer> {
  const document = pandocDocument(format, input)
  if (format === 'md') return Buffer.from(document)
  const dir = await mkdtemp(join(tmpdir(), 'wrote-export-'))
  const options = { cwd: dir, signal: input.signal }
  const args = { withParts: input.withParts, toc: input.matter.toc, titlePage: input.matter.title, root: input.root }
  try {
    await Promise.all([writeFile(join(dir, 'book.md'), document), writeFile(join(dir, 'book.css'), bookCss(input.preset.sceneBreak))])
    if (format === 'docx') await writeReferenceDoc(dir, input, options)
    if (format !== 'pdf') {
      await runTool('pandoc', pandocArgs(format, args, `book.${format}`), options)
      return await readFile(join(dir, `book.${format}`))
    }
    let n = 0
    const toTypst = async (markdown: string) => {
      const name = `part-${n++}`
      await writeFile(join(dir, `${name}.md`), markdown)
      await runTool('pandoc', [`${name}.md`, '--from', 'markdown', '--to', 'typst', `--top-level-division=${input.withParts ? 'part' : 'chapter'}`, `--resource-path=.:${input.root}`, '-o', `${name}.typ`], options)
      return readFile(join(dir, `${name}.typ`), 'utf8')
    }
    await writeFile(join(dir, 'main.typ'), await typstDocument(input, dir, toTypst))
    await runTool('typst', ['compile', '--root', '/', 'main.typ', 'book.pdf'], options)
    return await readFile(join(dir, 'book.pdf'))
  }
  finally {
    await rm(dir, { recursive: true, force: true })
  }
}

/** DOCX reference: Pandoc's default, turned into manuscript format when the preset asks for it. */
async function writeReferenceDoc(dir: string, input: RenderInput, options: { cwd: string, signal?: AbortSignal }) {
  await runTool('pandoc', ['-o', 'reference.docx', '--print-default-data-file', 'reference.docx'], options)
  if (!input.preset.manuscript) return
  const base = await readFile(join(dir, 'reference.docx'))
  await writeFile(join(dir, 'reference.docx'), manuscriptReferenceDocx(base, { surname: surnameOf(input.config.author), title: input.config.title }))
}
