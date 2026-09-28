import { z } from 'zod'
import { EntryIdSchema } from './entry'

export const EXPORT_FORMATS = ['epub', 'pdf', 'docx', 'html', 'md'] as const
export const ExportFormatSchema = z.enum(EXPORT_FORMATS)
export type ExportFormat = z.infer<typeof ExportFormatSchema>

export const ExportRequestSchema = z.object({
  format: ExportFormatSchema,
  /** Chapters to export (in book order); omitted or empty: the whole book. */
  chapterIds: z.array(EntryIdSchema).max(2000).optional(),
  /** Front matter (title page, copyright, dedication, contents …) and back matter, as the preset lists them. */
  frontMatter: z.boolean().default(true),
  /** Export preset id (built-in or the book's `.wrote/presets/<id>.yaml`); default: `default`. */
  presetId: z.string().max(60).optional(),
})
export type ExportRequest = z.infer<typeof ExportRequestSchema>

export type ExportTool = 'pandoc' | 'typst'

export interface ExportToolStatus {
  tool: ExportTool
  version: string | null
  /** Where it was found (env override or PATH); `null` when missing. */
  path: string | null
}

/** What the export dialog needs: tool availability and which formats work now. */
export interface ExportCapabilities {
  tools: ExportToolStatus[]
  formats: { format: ExportFormat, available: boolean, needs: ExportTool[] }[]
  /** How to install missing tools on this platform. */
  install: Partial<Record<ExportTool, string>>
}
