import { z } from 'zod'
import { ExportFormatSchema } from './export'

/** Front matter sections, in the order they appear. */
export const FRONT_MATTER = ['title', 'copyright', 'dedication', 'epigraph', 'toc'] as const
/** Back matter sections, in order. */
export const BACK_MATTER = ['acknowledgements', 'about-the-author'] as const
export type FrontMatterSection = (typeof FRONT_MATTER)[number]
export type BackMatterSection = (typeof BACK_MATTER)[number]

/** Named trim sizes (inches) plus A5/A4/Letter. */
export const TRIM_SIZES = { '5x8': [5, 8], '5.5x8.5': [5.5, 8.5], '6x9': [6, 9], 'a5': [5.83, 8.27], 'a4': [8.27, 11.69], 'letter': [8.5, 11] } as const
export type TrimSize = keyof typeof TRIM_SIZES

const Length = z.string().regex(/^\d+(\.\d+)?(in|cm|mm|pt)$/, 'A length such as 0.75in, 2cm or 18pt')

/** PDF layout (Typst). */
export const PdfLayoutSchema = z.object({
  trim: z.enum(Object.keys(TRIM_SIZES) as [TrimSize, ...TrimSize[]]).default('a5'),
  margins: z.object({ inside: Length, outside: Length, top: Length, bottom: Length }).partial().default({}),
  font: z.string().trim().min(1).max(80).default('Libertinus Serif'),
  fontSize: z.number().min(6).max(24).default(10.5),
  /** Line height as a multiple of the font size. */
  lineSpacing: z.number().min(0.8).max(3).default(1.35),
  chapterStyle: z.enum(['centered', 'left', 'numbered']).default('centered'),
})

/**
 * An export preset: a named set of options stored as YAML – built-in, or per book in `.wrote/presets/<id>.yaml`.
 * `manuscript: true` switches to standard manuscript format (Shunn) for DOCX and PDF.
 */
export const ExportPresetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(''),
  /** Formats the preset is made for (first = default). */
  formats: z.array(ExportFormatSchema).min(1).default(['epub', 'pdf', 'docx', 'html', 'md']),
  manuscript: z.boolean().default(false),
  sceneBreak: z.string().trim().min(1).max(10).default('* * *'),
  pdf: PdfLayoutSchema.default(PdfLayoutSchema.parse({})),
  frontMatter: z.array(z.enum(FRONT_MATTER)).default(['title', 'copyright', 'dedication', 'toc']),
  backMatter: z.array(z.enum(BACK_MATTER)).default(['acknowledgements', 'about-the-author']),
})
export type ExportPreset = z.infer<typeof ExportPresetSchema>
export type ExportPresetInput = z.input<typeof ExportPresetSchema>

export const PresetIdSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,59}$/, 'Lowercase letters, digits and dashes')

export interface ExportPresetView extends ExportPreset {
  id: string
  source: 'builtin' | 'book'
}

/** A preset file that could not be read (shown instead of silently ignored). */
export interface PresetError {
  file: string
  message: string
}

export interface PresetList {
  presets: ExportPresetView[]
  errors: PresetError[]
}

export const SavePresetSchema = z.object({ id: PresetIdSchema, preset: ExportPresetSchema })
/** Importing a shared preset file (YAML text). */
export const ImportPresetSchema = z.object({ id: PresetIdSchema.optional(), yaml: z.string().min(1).max(20_000) })
