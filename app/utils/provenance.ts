import type { ProvenanceStats } from '#shared/schemas/provenance'
import type { StructureNode } from '#shared/schemas/manuscript'
import { pathToNode } from '#shared/utils/manuscript-tree'

export interface AiShares {
  scene: number
  chapter: number | null
  book: number
}

/** AI-assisted share (0…1) of the open scene, its chapter and the book, or `null` when nothing is AI-assisted. */
export function aiShares(stats: { book: ProvenanceStats, entries: Record<string, ProvenanceStats> } | undefined, tree: StructureNode[], entryId: string | undefined): AiShares | null {
  if (!stats || !stats.book.aiWords) return null
  const chapter = entryId ? pathToNode(tree, entryId).find(node => node.type === 'chapter') : undefined
  return {
    scene: entryId ? stats.entries[entryId]?.share ?? 0 : 0,
    chapter: chapter ? stats.entries[chapter.id]?.share ?? 0 : null,
    book: stats.book.share,
  }
}

export const formatShare = (share: number) => `${Math.round(share * 100)} %`
