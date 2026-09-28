import type { ComponentPublicInstance } from 'vue'
import { COMMENTS_CONTEXT } from '~/editor/comments-context'
import { commentPositions } from '~/editor/extensions/comment-highlights'
import { stackCards } from '~/utils/comment-layout'

/**
 * Positions margin cards next to their passages: measures where each highlighted passage is relative to
 * the margin, then stacks the cards so they never overlap. Re-measures after edits and resizes.
 */
export function useCommentLayout(margin: Ref<HTMLElement | null>) {
  const context = inject(COMMENTS_CONTEXT, null)
  const heights = ref<Record<string, number>>({})
  const tops = ref<Record<string, number>>({})

  function measure() {
    const view = liveView(context?.editor.value)
    if (!view || !margin.value || !context) return
    const origin = margin.value.getBoundingClientRect().top
    const positions = commentPositions(view.state)
    const items = context.comments.value.map((comment, index) => {
      const pos = positions.get(comment.id)
      // Comments whose passage is gone go below the others, in order.
      return { id: comment.id, top: pos === undefined ? 1e6 + index : view.coordsAtPos(pos).top - origin }
    })
    tops.value = stackCards(items, heights.value)
  }

  /** Cards report their rendered height so stacking uses real sizes. */
  function setHeight(id: string, height: number) {
    if (heights.value[id] === height) return
    heights.value = { ...heights.value, [id]: height }
    void nextTick(measure)
  }

  // Cards grow with replies: observe their real height.
  const observer = import.meta.client
    ? new ResizeObserver(entries => entries.forEach((entry) => {
        const id = (entry.target as HTMLElement).dataset.commentId
        if (id) setHeight(id, Math.ceil(entry.contentRect.height))
      }))
    : null
  /** Template ref for a card element (carrying `data-comment-id`). */
  function observe(element: Element | ComponentPublicInstance | null) {
    if (element instanceof HTMLElement) observer?.observe(element)
  }
  onScopeDispose(() => observer?.disconnect())

  watch(() => [context?.layoutVersion.value, context?.comments.value, margin.value], () => void nextTick(measure), { immediate: true })
  return { tops, observe, measure }
}
