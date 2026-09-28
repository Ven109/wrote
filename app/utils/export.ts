import type { ExportFormat } from '#shared/schemas/export'
import type { StructureNode } from '#shared/schemas/manuscript'

export const FORMAT_INFO: Record<ExportFormat, { label: string, description: string, icon: string }> = {
  epub: { label: 'EPUB', description: 'E-readers and ebook stores', icon: 'i-lucide-book-open' },
  pdf: { label: 'PDF', description: 'Print-ready book layout (A5)', icon: 'i-lucide-file-text' },
  docx: { label: 'Word (DOCX)', description: 'Editors, agents and publishers', icon: 'i-lucide-file-type' },
  html: { label: 'HTML', description: 'One web page', icon: 'i-lucide-globe' },
  md: { label: 'Markdown', description: 'One clean Markdown file', icon: 'i-lucide-file-code' },
}

export interface ChapterOption {
  id: string
  title: string
  part: string
}

/** The chapters of the manuscript in book order, with their part (for the chapter picker). */
export const exportChapterOptions = (structure: StructureNode[]): ChapterOption[] =>
  structure.flatMap(part => part.children.filter(child => child.type === 'chapter').map(chapter => ({ id: chapter.id, title: chapter.title, part: part.title })))

/** The file name from a `Content-Disposition` header, else a fallback. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  return /filename="?([^";]+)"?/.exec(header ?? '')?.[1] ?? fallback
}
