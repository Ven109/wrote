import { describe, expect, it } from 'vitest'
import type { UsageGroup } from '#shared/schemas/usage'
import { budgetMessage, budgetShare, featureLabel, formatCost, formatTokens, groupShares } from './usage'

const group = (key: string, cost: number, tokens = 0): UsageGroup => ({ key, label: key, calls: 1, inputTokens: tokens, outputTokens: 0, cachedTokens: 0, cost, unpriced: 0 })

describe('usage formatting', () => {
  it('formats costs and tokens compactly', () => {
    expect([formatCost(0), formatCost(0.004), formatCost(12.3)]).toEqual(['$0.00', '<$0.01', '$12.30'])
    expect([formatTokens(950), formatTokens(1234), formatTokens(45_600), formatTokens(4_100_000)]).toEqual(['950', '1.2k', '46k', '4.1M'])
    expect([featureLabel('review'), featureLabel('custom')]).toEqual(['Reviews', 'custom'])
  })

  it('sizes bars by cost, or by tokens when nothing is priced', () => {
    expect(groupShares([group('a', 2), group('b', 1)])).toEqual([100, 50])
    expect(groupShares([group('a', 0, 10), group('b', 0, 40)])).toEqual([25, 100])
    expect(groupShares([])).toEqual([])
  })

  it('describes the budget', () => {
    expect(budgetShare({ month: '2026-09', spent: 12, budget: 10, level: 100 })).toBe(100)
    expect(budgetShare({ month: '2026-09', spent: 1, budget: null, level: 0 })).toBeNull()
    expect(budgetMessage({ month: '2026-09', spent: 8, budget: 10, level: 80 }).title).toBe('AI budget 80% used')
  })
})
