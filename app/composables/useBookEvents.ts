import type { BookChangeEvent } from '#shared/schemas/events'

/**
 * Subscribes to live file changes of a book via SSE. The handler runs for every change
 * (external edits, other tools, MCP clients). Reconnects automatically (EventSource).
 */
export function useBookEvents(bookId: MaybeRefOrGetter<string | null>, onChange: (event: BookChangeEvent) => void) {
  if (import.meta.server) return

  let source: EventSource | null = null

  function close() {
    source?.close()
    source = null
  }

  watch(() => toValue(bookId), (id) => {
    close()
    if (!id) return
    source = new EventSource(`/api/books/${encodeURIComponent(id)}/events`)
    source.addEventListener('change', (message) => {
      onChange(JSON.parse((message as MessageEvent<string>).data) as BookChangeEvent)
    })
  }, { immediate: true })

  onScopeDispose(close)
}
