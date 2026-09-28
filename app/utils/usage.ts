import type { AiFeature } from '#shared/schemas/ai'
import type { BudgetStatus, UsageGroup } from '#shared/schemas/usage'

/** Labels and help of the AI features (routing settings, usage page). */
export const FEATURE_INFO: Record<AiFeature | 'embeddings' | 'chat' | 'fast', { label: string, description: string }> = {
  assistant: { label: 'Assistant', description: 'The chat in the right sidebar.' },
  autocomplete: { label: 'Autocomplete', description: 'Ghost text while writing – a small, fast model feels best.' },
  inline: { label: 'Inline actions', description: 'Rewrite, expand, shorten … on a selection.' },
  summaries: { label: 'Summaries', description: 'Background scene and chapter summaries.' },
  review: { label: 'Reviews', description: 'Review agents – a large model finds more.' },
  extraction: { label: 'Codex scan', description: 'Finding characters, places … in chapters.' },
  outline: { label: 'Outline helpers', description: 'Bridge beats and plot-hole checks.' },
  embeddings: { label: 'Semantic search', description: 'Embedding passages for search.' },
  chat: { label: 'Chat model', description: '' },
  fast: { label: 'Fast model', description: '' },
}

export const featureLabel = (key: string) => FEATURE_INFO[key as keyof typeof FEATURE_INFO]?.label ?? key

/** `$0.42`, `$12.30`, `<$0.01` for tiny non-zero amounts. */
export function formatCost(usd: number): string {
  if (usd > 0 && usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(2)}`
}

/** `950`, `12.3k`, `4.1M`. */
export function formatTokens(tokens: number): string {
  if (tokens < 1000) return String(tokens)
  if (tokens < 1_000_000) return `${(tokens / 1000).toFixed(tokens < 10_000 ? 1 : 0)}k`
  return `${(tokens / 1_000_000).toFixed(1)}M`
}

/** Bar widths (0–100) relative to the largest group, by cost – or by tokens when nothing has a price. */
export function groupShares(groups: UsageGroup[]): number[] {
  const byCost = groups.some(group => group.cost > 0)
  const value = (group: UsageGroup) => (byCost ? group.cost : group.inputTokens + group.outputTokens)
  const max = Math.max(0, ...groups.map(value))
  return groups.map(group => (max ? Math.round((value(group) / max) * 100) : 0))
}

/** Share of the monthly budget spent (0–100, capped), or `null` without a budget. */
export const budgetShare = (status: BudgetStatus) => (status.budget ? Math.min(100, Math.round((status.spent / status.budget) * 100)) : null)

export function budgetMessage(status: BudgetStatus): { title: string, description: string } {
  const spent = `${formatCost(status.spent)} of ${formatCost(status.budget ?? 0)}`
  return status.level === 100
    ? { title: 'AI budget used up', description: `${spent} spent this month. AI keeps working – raise the budget or switch to cheaper models.` }
    : { title: 'AI budget 80% used', description: `${spent} spent this month.` }
}
