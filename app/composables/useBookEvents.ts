import type { ActivityEvent } from '#shared/schemas/activity'
import type { CommentEvent } from '#shared/schemas/comments'
import type { BookChangeEvent } from '#shared/schemas/events'
import type { JobEvent } from '#shared/schemas/jobs'
import type { ApprovalEvent } from '#shared/schemas/permissions'
import type { SuggestionEvent } from '#shared/schemas/suggestion'
import type { BudgetStatus } from '#shared/schemas/usage'

export interface BookEventHandlers {
  /** The stream is (re)connected – events sent while it was not are missed, so resync. */
  ready?: () => void
  /** File changes (external edits, other tools, MCP clients). */
  change?: (event: BookChangeEvent) => void
  /** Background job updates (queued, progress, finished). */
  job?: (event: JobEvent) => void
  /** Suggestions created or resolved (assistant, MCP clients, other tabs). */
  suggestion?: (event: SuggestionEvent) => void
  /** Tool calls waiting for the author's approval (and their outcome). */
  approval?: (event: ApprovalEvent) => void
  /** Tool calls logged in (or undone from) the activity log. */
  activity?: (event: ActivityEvent) => void
  /** Codex proposals created (scan, agents) or resolved. */
  codexProposal?: (event: { sourceEntryId: string }) => void
  /** Outline proposals created (assistant, agents, outline helpers) or resolved. */
  outlineProposal?: () => void
  /** Comments added, answered or resolved (author or agents). */
  comment?: (event: CommentEvent) => void
  /** The monthly AI budget crossed 80% or 100%. */
  usage?: (event: BudgetStatus) => void
}

/** Subscribes to a book's live event stream (SSE). Reconnects automatically (EventSource). */
export function useBookEvents(bookId: MaybeRefOrGetter<string | null>, handlers: BookEventHandlers) {
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
    source.addEventListener('ready', () => handlers.ready?.())
    source.addEventListener('change', (message) => {
      handlers.change?.(JSON.parse((message as MessageEvent<string>).data) as BookChangeEvent)
    })
    source.addEventListener('job', (message) => {
      handlers.job?.(JSON.parse((message as MessageEvent<string>).data) as JobEvent)
    })
    source.addEventListener('approval', (message) => {
      handlers.approval?.(JSON.parse((message as MessageEvent<string>).data) as ApprovalEvent)
    })
    source.addEventListener('activity', (message) => {
      handlers.activity?.(JSON.parse((message as MessageEvent<string>).data) as ActivityEvent)
    })
    source.addEventListener('codex-proposal', (message) => {
      handlers.codexProposal?.(JSON.parse((message as MessageEvent<string>).data) as { sourceEntryId: string })
    })
    source.addEventListener('outline-proposal', () => handlers.outlineProposal?.())
    source.addEventListener('usage', (message) => {
      handlers.usage?.(JSON.parse((message as MessageEvent<string>).data) as BudgetStatus)
    })
    source.addEventListener('comment', (message) => {
      handlers.comment?.(JSON.parse((message as MessageEvent<string>).data) as CommentEvent)
    })
    source.addEventListener('suggestion', (message) => {
      handlers.suggestion?.(JSON.parse((message as MessageEvent<string>).data) as SuggestionEvent)
    })
  }, { immediate: true })

  onScopeDispose(close)
}
