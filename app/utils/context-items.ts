import { CONTEXT_LAYERS, type ContextItem, type ContextLayer, type ContextOverrides, type ContextSnapshot, type OmittedContextItem } from '#shared/schemas/context'

export const LAYER_LABELS: Record<ContextLayer, string> = {
  pinned: 'Always included',
  local: 'What you are working on',
  retrieved: 'Found for this question',
  summary: 'Summaries',
}

/** One row in the context drawer: a sent or omitted item and what the author did with it. */
export interface ContextRow {
  item: ContextItem | OmittedContextItem
  sent: boolean
  pinned: boolean
  removed: boolean
}

export function toggleId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter(entry => entry !== id) : [...list, id]
}

/** Sent items grouped by layer (in prompt order), each with the author's current pin/remove state. */
export function contextGroups(snapshot: ContextSnapshot, overrides: ContextOverrides): { layer: ContextLayer, label: string, rows: ContextRow[] }[] {
  const row = (item: ContextItem): ContextRow => ({
    item,
    sent: true,
    pinned: overrides.pinned.includes(item.id),
    removed: overrides.removed.includes(item.id),
  })
  return CONTEXT_LAYERS
    .map(layer => ({ layer, label: LAYER_LABELS[layer], rows: snapshot.items.filter(item => item.layer === layer).map(row) }))
    .filter(group => group.rows.length)
}

/** Items that were not sent (over budget or removed): pin to include, un-remove to restore. */
export function omittedRows(snapshot: ContextSnapshot, overrides: ContextOverrides): ContextRow[] {
  return snapshot.omitted.map(item => ({
    item,
    sent: false,
    pinned: overrides.pinned.includes(item.id),
    removed: overrides.removed.includes(item.id),
  }))
}

export const sameOverrides = (a: ContextOverrides, b: ContextOverrides) =>
  JSON.stringify([[...a.pinned].sort(), [...a.removed].sort()]) === JSON.stringify([[...b.pinned].sort(), [...b.removed].sort()])
