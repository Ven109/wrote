import { ExportPresetSchema, type ExportPreset, type ExportPresetInput } from '#shared/schemas/export-preset'

const define = (preset: ExportPresetInput): ExportPreset => ExportPresetSchema.parse(preset)

const PRINT_MARGINS = { inside: '0.75in', outside: '0.6in', top: '0.7in', bottom: '0.75in' }

/** Presets every book has. Books add their own in `.wrote/presets/<id>.yaml` (same fields). */
export const BUILTIN_PRESETS: Record<string, ExportPreset> = {
  'default': define({
    name: 'Default',
    description: 'Ebook and A5 PDF with title page, copyright, dedication and contents.',
  }),
  'print-5x8': define({
    name: 'Print 5 × 8 in',
    description: 'Trade paperback, compact.',
    formats: ['pdf'],
    pdf: { trim: '5x8', margins: PRINT_MARGINS, fontSize: 10.5 },
  }),
  'print-5.5x8.5': define({
    name: 'Print 5.5 × 8.5 in',
    description: 'Trade paperback (digest).',
    formats: ['pdf'],
    pdf: { trim: '5.5x8.5', margins: PRINT_MARGINS, fontSize: 11 },
  }),
  'print-6x9': define({
    name: 'Print 6 × 9 in',
    description: 'The most common trade paperback size.',
    formats: ['pdf'],
    pdf: { trim: '6x9', margins: { inside: '0.875in', outside: '0.625in', top: '0.75in', bottom: '0.8in' }, fontSize: 11 },
  }),
  'manuscript': define({
    name: 'Standard manuscript (Shunn)',
    description: 'For agents and publishers: 12 pt Courier, double spaced, header with name, title and page, word count on the title page, # scene breaks.',
    formats: ['docx', 'pdf'],
    manuscript: true,
    sceneBreak: '#',
    pdf: { trim: 'letter', margins: { inside: '1in', outside: '1in', top: '1in', bottom: '1in' }, font: 'Courier New', fontSize: 12, lineSpacing: 2, chapterStyle: 'left' },
    frontMatter: ['title'],
    backMatter: [],
  }),
}
