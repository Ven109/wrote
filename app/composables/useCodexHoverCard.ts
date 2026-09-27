import { useEventListener } from '@vueuse/core'
import type { CodexMentionTarget } from '#shared/schemas/codex'

const OPEN_DELAY = 250
const CLOSE_DELAY = 200

/**
 * Hover card state for detected codex names in the editor: opens on hover (desktop) or tap (touch),
 * stays open while the pointer is over the card.
 */
export function useCodexHoverCard(root: Ref<HTMLElement | null | undefined>, resolve: (entryId: string) => CodexMentionTarget | undefined) {
  const open = ref(false)
  const anchor = shallowRef<HTMLElement | null>(null)
  const target = shallowRef<CodexMentionTarget | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  const mentionAt = (event: Event) => (event.target as HTMLElement | null)?.closest?.<HTMLElement>('.codex-mention') ?? null

  function show(element: HTMLElement) {
    const found = resolve(element.dataset.entryId ?? '')
    if (!found) return
    anchor.value = element
    target.value = found
    open.value = true
  }

  function scheduleClose() {
    clearTimeout(timer)
    timer = setTimeout(() => (open.value = false), CLOSE_DELAY)
  }

  function keepOpen() {
    clearTimeout(timer)
  }

  useEventListener(root, 'mouseover', (event: MouseEvent) => {
    const element = mentionAt(event)
    clearTimeout(timer)
    if (element) timer = setTimeout(() => show(element), OPEN_DELAY)
    else if (open.value) scheduleClose()
  })
  useEventListener(root, 'mouseleave', scheduleClose)
  // Touch devices have no hover: a tap on a detected name opens the card.
  useEventListener(root, 'click', (event: MouseEvent) => {
    const element = mentionAt(event)
    if (element && (event as PointerEvent).pointerType !== 'mouse') show(element)
  })
  onScopeDispose(() => clearTimeout(timer))

  return { open, anchor, target, keepOpen, scheduleClose }
}
