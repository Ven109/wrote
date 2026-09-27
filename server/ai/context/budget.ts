import { CONTEXT_LAYERS, type ContextItem, type ContextKind, type ContextOverrides, type OmittedContextItem } from '#shared/schemas/context'

/** Which items survive a tight budget first (lower = more important). Author pins beat everything. */
const KIND_PRIORITY: Record<ContextKind, number> = {
  'pin': 0,
  'selection': 1,
  'style-guide': 2,
  'synopsis': 3,
  'entry': 4,
  'summary': 6,
  'codex': 5,
  'search': 7,
}
/** The book summary is worth more than summaries of neighbouring scenes. */
const priorityOf = (item: ContextItem) => (item.pinned ? -1 : item.kind === 'summary' && item.id !== 'summary:book' ? 8 : KIND_PRIORITY[item.kind])

const omit = ({ text: _text, ...item }: ContextItem, reason: OmittedContextItem['reason']): OmittedContextItem => ({ ...item, reason })

export interface FittedContext {
  items: ContextItem[]
  omitted: OmittedContextItem[]
  used: number
}

/**
 * Applies the author's overrides and fits the items into `budget` tokens by priority. Items that do not
 * fit are omitted (smaller, less important ones may still fit). Output keeps layer order, then input order,
 * so the same inputs always produce the same prompt.
 */
export function fitToBudget(items: ContextItem[], budget: number, overrides: ContextOverrides = { pinned: [], removed: [] }): FittedContext {
  const removed = new Set(overrides.removed)
  const pinned = new Set(overrides.pinned)
  const candidates = items
    .filter(item => !removed.has(item.id))
    .map(item => (pinned.has(item.id) ? { ...item, pinned: true } : item))
  const omitted = items.filter(item => removed.has(item.id)).map(item => omit(item, 'removed'))
  const ranked = candidates.map((item, index) => ({ item, index })).sort((a, b) => priorityOf(a.item) - priorityOf(b.item) || a.index - b.index)
  const kept = new Set<ContextItem>()
  let used = 0
  for (const { item } of ranked) {
    // Pinned items are always sent, even over budget: the author asked for them.
    if (item.pinned || used + item.tokens <= budget) {
      kept.add(item)
      used += item.tokens
    }
    else {
      omitted.push(omit(item, 'budget'))
    }
  }
  const layerIndex = (item: ContextItem) => CONTEXT_LAYERS.indexOf(item.layer)
  const ordered = candidates.filter(item => kept.has(item)).map((item, index) => ({ item, index }))
    .sort((a, b) => layerIndex(a.item) - layerIndex(b.item) || a.index - b.index)
    .map(({ item }) => item)
  return { items: ordered, omitted, used }
}
