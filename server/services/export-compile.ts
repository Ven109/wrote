import { dirname, join } from 'node:path'
import type { BookConfig } from '#shared/schemas/book'
import type { StructureNode } from '#shared/schemas/manuscript'
import { blockExportPolicy } from '#shared/utils/directives'
import { prepareBody, type LinkTargets } from '../export/markdown'
import { InvalidInputError } from '../storage/errors'
import { getStructure } from './structure'
import type { BookContext } from './workspace'

export interface CompiledBook {
  markdown: string
  config: BookConfig
  /** Parts are shown (more than one part): Pandoc's top-level division is `part`, chapters sit below. */
  withParts: boolean
  chapters: number
  scenes: number
  /** Words of the exported scenes. */
  words: number
}

interface Plan {
  parts: { node: StructureNode, chapters: StructureNode[] }[]
  withParts: boolean
}

/** The parts and chapters to export, in book order (all, or only `chapterIds`). */
export function planChapters(structure: StructureNode[], chapterIds?: string[]): Plan {
  const wanted = chapterIds?.length ? new Set(chapterIds) : null
  const parts = structure
    .map(part => ({ node: part, chapters: part.children.filter(child => child.type === 'chapter' && (!wanted || wanted.has(child.id))) }))
    .filter(part => part.chapters.length)
  if (wanted && parts.reduce((sum, part) => sum + part.chapters.length, 0) < wanted.size) throw new InvalidInputError('Some selected chapters do not exist')
  return { parts, withParts: structure.length > 1 }
}

function linkTargets(plan: Plan): LinkTargets {
  const anchors = new Map<string, string>()
  const add = (node: StructureNode) => {
    anchors.set(node.id, node.id)
    anchors.set(node.title.toLowerCase(), node.id)
  }
  for (const part of plan.parts) {
    if (plan.withParts) add(part.node)
    part.chapters.forEach(chapter => [chapter, ...chapter.children].forEach(add))
  }
  return { anchors }
}

/**
 * Compiles the manuscript (or some chapters) into one Markdown document for Pandoc: parts and chapters as
 * headings with stable anchors, scenes separated by scene breaks, working blocks stripped, links resolved,
 * footnotes made unique. Metadata (title, author, language) goes into the YAML header.
 */
export async function compileManuscript(book: BookContext, options: { chapterIds?: string[] } = {}): Promise<CompiledBook> {
  const [config, structure] = await Promise.all([book.repository.readConfig(), getStructure(book.db)])
  const plan = planChapters(structure, options.chapterIds)
  const links = linkTargets(plan)
  const policy = blockExportPolicy(config.export.blocks)
  const chapterLevel = plan.withParts ? 2 : 1
  const blocks: string[] = []
  let sceneCount = 0
  let words = 0
  const body = async (node: StructureNode, prefix: string) => {
    const entry = await book.repository.read(node.path)
    const folder = dirname(node.path)
    return prepareBody(entry.body, { policy, footnotePrefix: prefix, links, headingShift: chapterLevel, resolveImage: src => join(book.repository.root, folder, src) })
  }
  for (const part of plan.parts) {
    if (plan.withParts) blocks.push(`# ${part.node.title} {#${part.node.id} .part}`)
    for (const chapter of part.chapters) {
      blocks.push(`${'#'.repeat(chapterLevel)} ${chapter.title} {#${chapter.id}}`)
      const intro = await body(chapter, chapter.id)
      if (intro) blocks.push(intro)
      const scenes = chapter.children.filter(child => child.type === 'scene')
      for (const [index, scene] of scenes.entries()) {
        if (index > 0) blocks.push('* * *')
        words += scene.wordCount
        blocks.push(`::: {#${scene.id} .scene}`, await body(scene, `s${++sceneCount}`), ':::')
      }
    }
  }
  return {
    markdown: `${blocks.filter(Boolean).join('\n\n')}\n`,
    config,
    withParts: plan.withParts,
    chapters: plan.parts.reduce((sum, part) => sum + part.chapters.length, 0),
    scenes: sceneCount,
    words,
  }
}
