import type { EntryType } from '#shared/schemas/entry'
import { entryHref } from './entry-href'

export interface ToolPartLike {
  type: string
  state: string
  input?: unknown
  output?: unknown
  errorText?: string
}

export interface ToolCallView {
  name: string
  label: string
  running: boolean
  failed: boolean
  input: unknown
  output: unknown
  error: string | null
  /** Entries referenced in the result, linkable in the chat. */
  entries: { title: string, href: string }[]
}

const LABELS: Record<string, (input: Record<string, unknown>) => string> = {
  search: input => `Searched “${String(input.query ?? '')}”`,
  read_entry: input => `Read ${String(input.path ?? input.id ?? 'an entry')}`,
  get_structure: () => 'Looked at the manuscript structure',
  get_codex: () => 'Looked up the codex',
  get_progress: () => 'Checked progress',
  list_books: () => 'Listed books',
  propose_edit: () => 'Proposed an edit',
  list_suggestions: () => 'Listed suggestions',
}

function referencedEntries(bookId: string, output: unknown): ToolCallView['entries'] {
  const items = Array.isArray(output) ? output : output && typeof output === 'object' ? [output] : []
  return items
    .filter((item): item is { title: string, path: string, type: EntryType } =>
      Boolean(item && typeof item === 'object' && 'title' in item && 'path' in item && 'type' in item))
    .slice(0, 10)
    .map(item => ({ title: item.title, href: entryHref(bookId, item) }))
}

/** Describes an AI SDK tool UI part (`tool-<name>`) for display. */
export function describeToolPart(bookId: string, part: ToolPartLike): ToolCallView {
  const name = part.type.replace(/^tool-/, '')
  const input = (part.input && typeof part.input === 'object' ? part.input : {}) as Record<string, unknown>
  return {
    name,
    label: LABELS[name]?.(input) ?? name.replace(/_/g, ' '),
    running: part.state === 'input-streaming' || part.state === 'input-available',
    failed: part.state === 'output-error',
    input: part.input,
    output: part.output,
    error: part.errorText ?? null,
    entries: part.state === 'output-available' ? referencedEntries(bookId, part.output) : [],
  }
}

export const isToolPart = (part: { type: string }): part is ToolPartLike => part.type.startsWith('tool-')
