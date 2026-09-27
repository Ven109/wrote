import type { StructureNode } from '../schemas/manuscript'

export type NodeType = StructureNode['type']

/** Which node type may contain which: parts hold chapters, chapters hold scenes. */
export const CHILD_TYPE: Record<NodeType, NodeType | null> = { part: 'chapter', chapter: 'scene', scene: null }

export interface NodeLocation {
  node: StructureNode
  parent: StructureNode | null
  siblings: StructureNode[]
  index: number
}

/** Finds a node by id, with its parent and sibling list. */
export function locateNode(roots: StructureNode[], id: string, parent: StructureNode | null = null): NodeLocation | null {
  for (const [index, node] of roots.entries()) {
    if (node.id === id) return { node, parent, siblings: roots, index }
    const found = locateNode(node.children, id, node)
    if (found) return found
  }
  return null
}

/** Chain of nodes from the root part down to `id` (for breadcrumbs). */
export function pathToNode(roots: StructureNode[], id: string): StructureNode[] {
  for (const node of roots) {
    if (node.id === id) return [node]
    const rest = pathToNode(node.children, id)
    if (rest.length) return [node, ...rest]
  }
  return []
}

export function findNodeByPath(roots: StructureNode[], path: string): StructureNode | null {
  for (const node of roots) {
    if (node.path === path) return node
    const found = findNodeByPath(node.children, path)
    if (found) return found
  }
  return null
}

/** True if `node` may be placed under `parent` (null = top level). */
export function canContain(parent: StructureNode | null, node: StructureNode): boolean {
  return parent === null ? node.type === 'part' : CHILD_TYPE[parent.type] === node.type
}

function sumWords(node: StructureNode): number {
  if (node.type !== 'scene') node.wordCount = node.children.reduce((sum, child) => sum + sumWords(child), 0)
  return node.wordCount
}

/**
 * Returns a new tree with node `id` moved to `index` under `parentId` (null = top level).
 * Used for optimistic updates; returns `null` if the move is invalid.
 */
export function moveInTree(roots: StructureNode[], id: string, parentId: string | null, index: number): StructureNode[] | null {
  const tree = structuredClone(roots)
  const from = locateNode(tree, id)
  if (!from) return null
  const target = parentId ? locateNode(tree, parentId)?.node ?? null : null
  if (parentId && !target) return null
  if (!canContain(target, from.node)) return null
  from.siblings.splice(from.index, 1)
  const siblings = target ? target.children : tree
  siblings.splice(Math.min(index, siblings.length), 0, from.node)
  tree.forEach(sumWords)
  return tree
}

/** Target for moving a node one position up or down among its siblings, or null at the edge. */
export function neighbourMove(roots: StructureNode[], id: string, direction: -1 | 1): { parentId: string | null, index: number } | null {
  const location = locateNode(roots, id)
  if (!location) return null
  const index = location.index + direction
  if (index < 0 || index >= location.siblings.length) return null
  return { parentId: location.parent?.id ?? null, index }
}
