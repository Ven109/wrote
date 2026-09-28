import type { ModelPrice, TokenUsage } from '#shared/schemas/usage'

/**
 * Built-in price estimates (USD per million tokens, list prices; they change – authors can set their own in
 * the AI settings). Keys are `provider:model` or a `provider:` prefix. Local models cost nothing.
 */
export const DEFAULT_PRICES: Record<string, ModelPrice> = {
  'anthropic:claude-opus': { input: 5, output: 25, cachedInput: 0.5 },
  'anthropic:claude-sonnet': { input: 3, output: 15, cachedInput: 0.3 },
  'anthropic:claude-haiku': { input: 1, output: 5, cachedInput: 0.1 },
  'openai:gpt-5-mini': { input: 0.25, output: 2, cachedInput: 0.025 },
  'openai:gpt-5-nano': { input: 0.05, output: 0.4, cachedInput: 0.005 },
  'openai:gpt-5': { input: 1.25, output: 10, cachedInput: 0.125 },
  'openai:text-embedding-3-small': { input: 0.02, output: 0 },
  'openai:text-embedding-3-large': { input: 0.13, output: 0 },
  'google:gemini-2.5-pro': { input: 1.25, output: 10, cachedInput: 0.31 },
  'google:gemini-2.5-flash': { input: 0.3, output: 2.5, cachedInput: 0.075 },
  'mistral:mistral-large': { input: 2, output: 6 },
  'mistral:mistral-small': { input: 0.1, output: 0.3 },
  'openrouter:anthropic/claude-sonnet': { input: 3, output: 15, cachedInput: 0.3 },
  'ollama:': { input: 0, output: 0 },
}

/** The price of a model: the author's own, else the longest matching built-in prefix, else `null` (unknown). */
export function priceFor(ref: string, overrides: Record<string, ModelPrice> = {}): ModelPrice | null {
  if (overrides[ref]) return overrides[ref]
  const match = Object.keys(DEFAULT_PRICES).filter(key => ref.startsWith(key)).sort((a, b) => b.length - a.length)[0]
  return match ? DEFAULT_PRICES[match]! : null
}

/** Estimated cost in USD, or `null` without a price. Cached prompt tokens are billed at the cached rate. */
export function estimateCost(usage: TokenUsage, price: ModelPrice | null): number | null {
  if (!price) return null
  const cached = Math.min(usage.cachedTokens, usage.inputTokens)
  const cost = (usage.inputTokens - cached) * price.input + cached * (price.cachedInput ?? price.input) + usage.outputTokens * price.output
  return cost / 1_000_000
}
