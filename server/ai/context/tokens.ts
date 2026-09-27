/**
 * Rough token estimate (≈ 3.5 characters per token for alphabetic scripts, one per CJK character).
 * Deliberately conservative: budgets use it to stay below model limits without a tokenizer per provider.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  let wide = 0
  for (const char of text) if (char.codePointAt(0)! > 0x2E80) wide++
  return Math.ceil((text.length - wide) / 3.5 + wide)
}

interface ModelLimit {
  match: RegExp
  context: number
}

/** Context windows (tokens) of known model families; unknown models get a conservative default. */
const MODEL_LIMITS: ModelLimit[] = [
  { match: /^anthropic:|claude/i, context: 200_000 },
  { match: /gpt-5|gpt-4\.1|\bo[34]\b/i, context: 400_000 },
  { match: /gpt-4o/i, context: 128_000 },
  { match: /gemini/i, context: 1_000_000 },
  { match: /mistral-large|mistral-medium/i, context: 128_000 },
  { match: /mistral|mixtral/i, context: 32_000 },
  { match: /llama3\.[1-3]|llama-3\.[1-3]|qwen2\.5|qwen3/i, context: 32_000 },
]
const LOCAL_DEFAULT = 8_192
const CLOUD_DEFAULT = 32_000

export function contextWindow(modelRef: string): number {
  const found = MODEL_LIMITS.find(limit => limit.match.test(modelRef))
  if (found) return found.context
  return /^(ollama|openai-compatible):/.test(modelRef) ? LOCAL_DEFAULT : CLOUD_DEFAULT
}

/** Tokens available for context items: a share of the window (room for instructions, chat and answer), capped. */
export function contextBudget(modelRef: string): number {
  return Math.min(Math.floor(contextWindow(modelRef) * 0.35), 24_000)
}
