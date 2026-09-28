import { describe, expect, it } from 'vitest'
import { estimateCost, priceFor } from './pricing'

describe('priceFor', () => {
  it('uses the author\'s price, else the longest built-in prefix, else null', () => {
    expect(priceFor('anthropic:claude-sonnet-5')).toMatchObject({ input: 3, output: 15 })
    expect(priceFor('openai:gpt-5-mini')).toMatchObject({ input: 0.25 })
    expect(priceFor('openai:gpt-5')).toMatchObject({ input: 1.25 })
    expect(priceFor('ollama:llama3.2')).toEqual({ input: 0, output: 0 })
    expect(priceFor('openai-compatible:local')).toBeNull()
    expect(priceFor('openai-compatible:local', { 'openai-compatible:local': { input: 1, output: 1 } })).toEqual({ input: 1, output: 1 })
  })
})

describe('estimateCost', () => {
  it('bills cached prompt tokens at the cached rate', () => {
    const price = { input: 3, output: 15, cachedInput: 0.3 }
    expect(estimateCost({ inputTokens: 1_000_000, outputTokens: 100_000, cachedTokens: 0 }, price)).toBeCloseTo(4.5)
    expect(estimateCost({ inputTokens: 1_000_000, outputTokens: 0, cachedTokens: 800_000 }, price)).toBeCloseTo(0.6 + 0.24)
    expect(estimateCost({ inputTokens: 10, outputTokens: 10, cachedTokens: 0 }, null)).toBeNull()
  })
})
