import type { ExportRequest } from '#shared/schemas/export'
import { slugify } from '#shared/utils/slug'
import { CONTENT_TYPES, renderExport } from '../export/render'
import { exportCapabilities, FORMAT_TOOLS, MissingToolError } from '../export/tools'
import { InvalidInputError } from '../storage/errors'
import { compileManuscript } from './export-compile'
import type { BookContext } from './workspace'

export interface ExportFile {
  filename: string
  contentType: string
  data: Buffer
}

/**
 * Exports the book (or some chapters) as EPUB, PDF, DOCX, HTML or Markdown. Missing Pandoc/Typst is a
 * `MissingToolError` with install hints – never a half-finished export.
 */
export async function exportBook(book: BookContext, request: ExportRequest, signal?: AbortSignal): Promise<ExportFile> {
  const capabilities = await exportCapabilities()
  const found = new Set(capabilities.tools.filter(status => status.path).map(status => status.tool))
  const missing = FORMAT_TOOLS[request.format].filter(tool => !found.has(tool))
  if (missing.length) throw new MissingToolError(missing, capabilities.install)
  const compiled = await compileManuscript(book, { chapterIds: request.chapterIds })
  if (!compiled.chapters) throw new InvalidInputError('Nothing to export yet – the book has no chapters')
  const data = await renderExport(request.format, { ...compiled, frontMatter: request.frontMatter, root: book.repository.root, signal })
  return { filename: `${slugify(compiled.config.title) || 'book'}.${request.format}`, contentType: CONTENT_TYPES[request.format], data }
}
