import { z } from 'zod'

/** Price of a model in USD per million tokens. `cachedInput`: cached prompt tokens read (defaults to `input`). */
export const ModelPriceSchema = z.object({
  input: z.number().min(0).max(1000),
  output: z.number().min(0).max(1000),
  cachedInput: z.number().min(0).max(1000).optional(),
})
export type ModelPrice = z.infer<typeof ModelPriceSchema>

/** Token counts of one model call. */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  /** Prompt tokens read from the provider's cache (part of `inputTokens`). */
  cachedTokens: number
}

/** One recorded AI call. */
export interface AiCall extends TokenUsage {
  at: string
  bookId: string | null
  feature: string
  model: string
  /** Estimated cost in USD; `null` when the model has no known price. */
  cost: number | null
}

export const UsageQuerySchema = z.object({
  /** How many months back (including the current one). */
  months: z.coerce.number().int().min(1).max(24).default(6),
  bookId: z.string().optional(),
})
export type UsageQuery = z.infer<typeof UsageQuerySchema>

export interface UsageTotals extends TokenUsage {
  calls: number
  cost: number
  /** Calls whose model has no known price (not in `cost`). */
  unpriced: number
}

export interface UsageGroup extends UsageTotals {
  key: string
  label: string
}

/** Budget state of the current month: `level` 80 or 100 once that share of the budget is spent. */
export interface BudgetStatus {
  month: string
  spent: number
  budget: number | null
  level: 0 | 80 | 100
}

export interface UsageReport {
  totals: UsageTotals
  byFeature: UsageGroup[]
  byModel: UsageGroup[]
  byBook: UsageGroup[]
  byMonth: UsageGroup[]
  budget: BudgetStatus
}
