import { TRIM_SIZES, type ExportPreset } from '#shared/schemas/export-preset'
import type { BookConfig } from '#shared/schemas/book'

/** A Typst string literal. */
export const typstString = (value: string) => JSON.stringify(value)

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

const DEFAULT_MARGINS = { inside: '0.75in', outside: '0.6in', top: '0.7in', bottom: '0.75in' }

/** Arguments of the book template's `book.with(...)` from the preset's PDF layout. */
export function typstBookOptions(input: { config: BookConfig, preset: ExportPreset, withParts: boolean }): string {
  const { pdf } = input.preset
  const [width, height] = TRIM_SIZES[pdf.trim]
  const margins = { ...DEFAULT_MARGINS, ...pdf.margins }
  return [
    `width: ${width}in, height: ${height}in`,
    `inside: ${margins.inside}, outside: ${margins.outside}, top: ${margins.top}, bottom: ${margins.bottom}`,
    `font: ${typstString(pdf.font)}, size: ${pdf.fontSize}pt, spacing: ${pdf.lineSpacing}`,
    `chapter-style: ${typstString(pdf.chapterStyle)}, parts: ${input.withParts}`,
    `lang: ${typstString(input.config.language.slice(0, 2))}, title: ${typstString(input.config.title)}, author: ${input.config.author ? typstString(input.config.author) : 'none'}`,
    `scene-break: ${typstString(input.preset.sceneBreak)}`,
  ].join(', ')
}
