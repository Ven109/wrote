import { BOOK_LAYOUT } from '#shared/book/layout'
import type { BookConfig } from '#shared/schemas/book'
import type { BackMatterSection, ExportPreset, FrontMatterSection } from '#shared/schemas/export-preset'
import { readRawFile } from '../storage/raw'

export interface MatterSection {
  id: FrontMatterSection | BackMatterSection
  title: string
  markdown: string
}

export interface BookMatter {
  /** Title page (from the book's title, subtitle and author). */
  title: boolean
  /** Table of contents (after the front matter sections). */
  toc: boolean
  /** Copyright, dedication, epigraph – in preset order, only those with content. */
  front: MatterSection[]
  /** Acknowledgements, about the author. */
  back: MatterSection[]
}

const TITLES: Record<MatterSection['id'], string> = {
  'title': 'Title',
  'copyright': 'Copyright',
  'dedication': 'Dedication',
  'epigraph': 'Epigraph',
  'toc': 'Contents',
  'acknowledgements': 'Acknowledgements',
  'about-the-author': 'About the Author',
}

/** Generated copyright page when the book has no `matter/copyright.md`. */
export const defaultCopyright = (config: BookConfig, year: number) =>
  `Copyright © ${year} ${config.author ?? 'the author'}. All rights reserved.\n\nThis is a work of fiction. Names, characters, places and incidents are products of the author's imagination.`

/**
 * The front and back matter an export includes: the preset decides which sections and their order; content
 * comes from `matter/<section>.md` (a generated copyright page is the fallback). Sections without content are
 * left out. With `enabled: false` only the manuscript itself is exported.
 */
export async function readMatter(root: string, config: BookConfig, preset: ExportPreset, options: { enabled: boolean, year?: number }): Promise<BookMatter> {
  if (!options.enabled) return { title: false, toc: false, front: [], back: [] }
  const year = options.year ?? new Date().getFullYear()
  const section = async (id: MatterSection['id']): Promise<MatterSection | null> => {
    const text = (await readRawFile(root, `${BOOK_LAYOUT.matter}/${id}.md`))?.replace(/^---\n[\s\S]*?\n---\n/, '').trim()
    const markdown = text || (id === 'copyright' ? defaultCopyright(config, year) : '')
    return markdown ? { id, title: TITLES[id], markdown } : null
  }
  const pick = async <T extends MatterSection['id']>(ids: T[]) => (await Promise.all(ids.map(section))).filter((s): s is MatterSection => s !== null)
  return {
    title: preset.frontMatter.includes('title'),
    toc: preset.frontMatter.includes('toc'),
    front: await pick(preset.frontMatter.filter(id => id !== 'title' && id !== 'toc')),
    back: await pick(preset.backMatter),
  }
}

/**
 * Matter sections as Markdown for Pandoc: unnumbered, unlisted headings with the section id as class
 * (EPUB/HTML hide the heading of copyright, dedication and epigraph via CSS).
 */
export function matterMarkdown(sections: MatterSection[], level: number): string {
  return sections.map(section => `${'#'.repeat(level)} ${section.title} {.unnumbered .unlisted .${section.id}}\n\n${section.markdown}`).join('\n\n')
}
