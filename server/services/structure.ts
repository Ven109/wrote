import type { SceneStatus } from '#shared/schemas/entry'
import type { StructureNode } from '#shared/schemas/manuscript'
import type { IndexDb } from '../db/client'

export type { StructureNode } from '#shared/schemas/manuscript'

interface Row { id: string, type: string, title: string, path: string, status: string | null, word_count: number }

/** Builds the manuscript tree (parts → chapters → scenes) from the index, ordered by path. */
export async function getStructure(db: IndexDb): Promise<StructureNode[]> {
  const result = await db.$client.execute(
    `SELECT id, type, title, path, status, word_count FROM entries WHERE type IN ('part','chapter','scene') ORDER BY path`,
  )
  const rows = result.rows as unknown as Row[]
  const folderOf = (row: Row) => row.type === 'scene' ? row.path.replace(/\/[^/]+$/, '') : row.path.replace(/\/index\.md$/, '')
  const parentFolderOf = (row: Row) => row.type === 'scene' ? folderOf(row) : folderOf(row).replace(/\/[^/]+$/, '')
  const toNode = (row: Row): StructureNode => ({
    id: row.id,
    type: row.type as StructureNode['type'],
    title: row.title,
    path: row.path,
    wordCount: Number(row.word_count),
    ...(row.status ? { status: row.status as SceneStatus } : {}),
    children: [],
  })

  // Pass 1: folder nodes (parts, chapters). Pass 2: attach every node to its parent folder in path order.
  const nodes = new Map(rows.map(row => [row.path, toNode(row)]))
  const folders = new Map(rows.filter(row => row.type !== 'scene').map(row => [folderOf(row), nodes.get(row.path)!]))
  const roots: StructureNode[] = []
  for (const row of rows) {
    const node = nodes.get(row.path)!
    const parent = folders.get(parentFolderOf(row))
    if (parent && parent !== node) parent.children.push(node)
    else if (row.type === 'part') roots.push(node)
  }
  const total = (node: StructureNode): number => node.type === 'scene' ? node.wordCount : (node.wordCount = node.children.reduce((sum, child) => sum + total(child), node.wordCount))
  roots.forEach(total)
  return roots
}
