import { describe, expect, it } from 'vitest'
import type { ContextItem } from '#shared/schemas/context'
import { fitToBudget } from './budget'
import { contextBudget, contextWindow, estimateTokens } from './tokens'

const item = (id: string, layer: ContextItem['layer'], kind: ContextItem['kind'], tokens: number): ContextItem =>
  ({ id, layer, kind, title: id, source: null, text: 'x'.repeat(tokens), tokens, pinned: false })

const items = [
  item('summary:book', 'summary', 'summary', 100),
  item('search:scn_a', 'retrieved', 'search', 300),
  item('entry:scn_b', 'local', 'entry', 400),
  item('style-guide', 'pinned', 'style-guide', 200),
  item('codex:cdx_m', 'retrieved', 'codex', 150),
  item('summary:scn_c', 'summary', 'summary', 80),
]

describe('fitToBudget', () => {
  it('keeps everything that fits, in layer order', () => {
    const fitted = fitToBudget(items, 10_000)
    expect(fitted.items.map(i => i.id)).toEqual(['style-guide', 'entry:scn_b', 'search:scn_a', 'codex:cdx_m', 'summary:book', 'summary:scn_c'])
    expect(fitted.used).toBe(1230)
    expect(fitted.omitted).toEqual([])
  })

  it('drops the least important items first and reports them', () => {
    const fitted = fitToBudget(items, 900)
    // style guide 200 + entry 400 + book summary 100 + codex 150 = 850; search (300) and scene summary (80 would fit after search is skipped).
    expect(fitted.items.map(i => i.id)).toEqual(['style-guide', 'entry:scn_b', 'codex:cdx_m', 'summary:book'])
    expect(fitted.omitted.map(i => [i.id, i.reason])).toEqual([['search:scn_a', 'budget'], ['summary:scn_c', 'budget']])
    expect(fitted.omitted[0]).not.toHaveProperty('text')
    expect(fitted.used).toBeLessThanOrEqual(900)
  })

  it('applies author overrides: removed items go, pinned items stay even over budget', () => {
    const fitted = fitToBudget(items, 800, { pinned: ['search:scn_a'], removed: ['style-guide'] })
    expect(fitted.items.find(i => i.id === 'search:scn_a')?.pinned).toBe(true)
    expect(fitted.items.map(i => i.id)).toContain('entry:scn_b')
    expect(fitted.omitted.find(i => i.id === 'style-guide')?.reason).toBe('removed')
    const tight = fitToBudget(items, 100, { pinned: ['entry:scn_b'], removed: [] })
    expect(tight.items.map(i => i.id)).toEqual(['entry:scn_b'])
    expect(tight.used).toBe(400)
  })

  it('is deterministic', () => {
    expect(fitToBudget([...items], 700)).toEqual(fitToBudget([...items], 700))
  })
})

describe('tokens', () => {
  it('estimates tokens conservatively', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('a'.repeat(350))).toBe(100)
    expect(estimateTokens('海辺の町')).toBe(4)
  })

  it('knows context windows and caps the context budget', () => {
    expect(contextWindow('anthropic:claude-sonnet-5')).toBe(200_000)
    expect(contextWindow('ollama:mystery-model')).toBe(8192)
    expect(contextWindow('openrouter:unknown/model')).toBe(32_000)
    expect(contextBudget('ollama:mystery-model')).toBe(2867)
    expect(contextBudget('anthropic:claude-sonnet-5')).toBe(24_000)
  })
})
