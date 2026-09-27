import type { StructureNode } from '#shared/schemas/manuscript'
import { pathToNode } from '#shared/utils/manuscript-tree'

export interface LiveWordCounts {
  scene: number
  chapter: number | null
  book: number
}

/**
 * Word counts while editing: the index knows the saved counts, the draft adds the unsaved delta
 * to the scene's chapter and the book.
 */
export function liveWordCounts(tree: StructureNode[], sceneId: string | undefined, liveScene: number): LiveWordCounts {
  const trail = sceneId ? pathToNode(tree, sceneId) : []
  const scene = trail.at(-1)
  const delta = scene ? liveScene - scene.wordCount : 0
  const chapter = trail.find(node => node.type === 'chapter')
  const book = tree.reduce((sum, part) => sum + part.wordCount, 0) + delta
  return { scene: liveScene, chapter: chapter ? chapter.wordCount + delta : null, book }
}
