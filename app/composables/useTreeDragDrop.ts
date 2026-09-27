import type { StructureNode } from '#shared/schemas/manuscript'
import { canContain, locateNode } from '#shared/utils/manuscript-tree'
import type { MoveTarget } from './useManuscript'

export type DropPosition = 'before' | 'after' | 'inside'

/**
 * Native HTML5 drag & drop for the manuscript tree (desktop / fine pointer only).
 * Computes where a dragged node would land and calls `onMove` with a validated target.
 */
export function useTreeDragDrop(tree: MaybeRefOrGetter<StructureNode[]>, onMove: (nodeId: string, target: MoveTarget) => void) {
  const draggingId = ref<string | null>(null)
  const dropTarget = ref<{ id: string, position: DropPosition } | null>(null)

  /** Resolves a drop on `targetId` at `position` to a move target, or null if not allowed. */
  function resolveTarget(nodeId: string, targetId: string, position: DropPosition): MoveTarget | null {
    const roots = toValue(tree)
    const dragged = locateNode(roots, nodeId)
    const target = locateNode(roots, targetId)
    if (!dragged || !target || nodeId === targetId) return null
    if (position === 'inside') {
      if (!canContain(target.node, dragged.node)) return null
      return { parentId: target.node.id, index: target.node.children.length }
    }
    if (!canContain(target.parent, dragged.node)) return null
    let index = target.index + (position === 'after' ? 1 : 0)
    // Removing the dragged node first shifts later siblings up by one.
    if (dragged.parent?.id === target.parent?.id && dragged.index < index) index--
    return { parentId: target.parent?.id ?? null, index }
  }

  function positionFromEvent(event: DragEvent, node: StructureNode): DropPosition {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const ratio = (event.clientY - rect.top) / rect.height
    if (node.type !== 'scene' && ratio > 0.25 && ratio < 0.75) return 'inside'
    return ratio < 0.5 ? 'before' : 'after'
  }

  function handlers(node: StructureNode) {
    return {
      draggable: 'true',
      onDragstart(event: DragEvent) {
        draggingId.value = node.id
        event.dataTransfer?.setData('text/plain', node.id)
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
      },
      onDragover(event: DragEvent) {
        if (!draggingId.value) return
        const position = positionFromEvent(event, node)
        if (!resolveTarget(draggingId.value, node.id, position)) return
        event.preventDefault()
        dropTarget.value = { id: node.id, position }
      },
      onDragleave() {
        if (dropTarget.value?.id === node.id) dropTarget.value = null
      },
      onDrop(event: DragEvent) {
        event.preventDefault()
        const id = draggingId.value
        const drop = dropTarget.value
        draggingId.value = null
        dropTarget.value = null
        const target = id && drop ? resolveTarget(id, drop.id, drop.position) : null
        if (id && target) onMove(id, target)
      },
      onDragend() {
        draggingId.value = null
        dropTarget.value = null
      },
    }
  }

  return { draggingId, dropTarget, resolveTarget, handlers }
}
