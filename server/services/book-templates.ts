import { createId } from '#shared/utils/ids'
import type { BookRepository } from '../storage/repository'

export type BookTemplate = 'novel' | 'non-fiction' | 'blank'

const STARTER_FOLDERS: Record<BookTemplate, string[]> = {
  'novel': ['notes/inbox', 'codex/characters', 'codex/places', 'codex/lore', 'research'],
  'non-fiction': ['notes/inbox', 'codex/glossary', 'research'],
  'blank': ['notes/inbox'],
}

const STARTER_STRUCTURE: Record<BookTemplate, { part: string, chapter: string, scene: string }> = {
  'novel': { part: 'Part One', chapter: 'Chapter One', scene: 'Opening' },
  'non-fiction': { part: 'Part One', chapter: 'Introduction', scene: 'Why this book' },
  'blank': { part: 'Part One', chapter: 'Chapter One', scene: 'Untitled' },
}

/** Creates the starter folders and first part/chapter/scene. Returns the path of the first scene. */
export async function applyBookTemplate(repository: BookRepository, template: BookTemplate, mkdir: (path: string) => Promise<void>): Promise<string> {
  for (const folder of STARTER_FOLDERS[template]) await mkdir(folder)
  const names = STARTER_STRUCTURE[template]
  const part = await repository.create({ type: 'part', dir: 'manuscript', title: names.part })
  const partDir = part.path.replace(/\/index\.md$/, '')
  const chapter = await repository.create({ type: 'chapter', dir: partDir, title: names.chapter })
  const chapterDir = chapter.path.replace(/\/index\.md$/, '')
  const scene = await repository.create({ type: 'scene', dir: chapterDir, title: names.scene, frontmatter: { status: 'draft' } })
  if (template !== 'blank') {
    await repository.write('outline.md', { frontmatter: { id: createId('outline'), title: 'Outline', tags: [] }, body: '' })
    await repository.write('style-guide.md', { frontmatter: { id: createId('style-guide'), title: 'Style guide', tags: [] }, body: '' })
  }
  return scene.path
}
