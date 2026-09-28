import type { TimelineItem } from '#shared/schemas/timeline'
import { draggedKey } from '~/utils/timeline-layout'

/**
 * Horizontal drag of a timeline item (pointer, mouse or touch): follows the pointer while dragging and
 * reports the snapped new key on release. Moves under a few pixels count as a click, not a drag.
 */
export function useTimelineDrag(perDay: MaybeRefOrGetter<number>, onDrop: (item: TimelineItem, key: number) => void) {
  const dragging = ref<string | null>(null)
  const offset = ref(0)
  let startX = 0
  let moved = false

  function start(event: PointerEvent, item: TimelineItem) {
    if (event.button !== 0) return
    startX = event.clientX
    moved = false
    dragging.value = item.id
    offset.value = 0
    const target = event.currentTarget as HTMLElement | null
    target?.setPointerCapture?.(event.pointerId)
  }

  function move(event: PointerEvent) {
    if (!dragging.value) return
    offset.value = event.clientX - startX
    if (Math.abs(offset.value) > 4) moved = true
  }

  /** Ends the drag; returns whether it was one (so the click that follows is ignored). */
  function end(item: TimelineItem): boolean {
    if (dragging.value !== item.id) return false
    const wasDrag = moved
    if (wasDrag) onDrop(item, draggedKey(item.key, offset.value, toValue(perDay)))
    dragging.value = null
    offset.value = 0
    return wasDrag
  }

  return { dragging, offset, start, move, end, cancel: () => (dragging.value = null) }
}
