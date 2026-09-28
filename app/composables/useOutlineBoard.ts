import type { Outline, OutlineOp } from '#shared/schemas/outline'
import { moveForDrop, type BeatDrop } from '~/utils/outline-board'

/**
 * Native drag & drop for the outline board (fine pointers; touch uses the card menu): cards drop before
 * the card under the pointer's upper half, after it on the lower half, or at the end of a column.
 */
export function useOutlineBoard(outline: MaybeRefOrGetter<Outline>, apply: (op: OutlineOp) => unknown) {
  const dragging = ref<string | null>(null)
  const drop = ref<BeatDrop | null>(null)

  function finish() {
    const op = dragging.value && drop.value ? moveForDrop(toValue(outline), dragging.value, drop.value) : null
    dragging.value = null
    drop.value = null
    if (op) apply(op)
  }

  function card(beatId: string, actId: string, nextBeatId: string | null) {
    return {
      draggable: 'true',
      onDragstart(event: DragEvent) {
        dragging.value = beatId
        event.dataTransfer?.setData('text/plain', beatId)
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
      },
      onDragover(event: DragEvent) {
        if (!dragging.value) return
        event.preventDefault()
        event.stopPropagation()
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
        drop.value = { actId, beforeBeatId: event.clientY < rect.top + rect.height / 2 ? beatId : nextBeatId }
      },
      onDrop(event: DragEvent) {
        event.preventDefault()
        event.stopPropagation()
        finish()
      },
      onDragend: () => {
        dragging.value = null
        drop.value = null
      },
    }
  }

  function column(actId: string) {
    return {
      onDragover(event: DragEvent) {
        if (!dragging.value) return
        event.preventDefault()
        drop.value = { actId, beforeBeatId: null }
      },
      onDrop(event: DragEvent) {
        event.preventDefault()
        finish()
      },
    }
  }

  return { dragging, drop, card, column }
}
