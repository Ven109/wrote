import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import type { BudgetStatus } from '#shared/schemas/usage'
import { closeUsageDbs } from '../db/usage'
import { subscribeUsageEvents } from '../utils/book-events'
import { updateAiSettings } from './ai-settings'
import { budgetLevel, recordAiCall, usageReport } from './usage'

let workspaceDir: string
beforeEach(async () => {
  workspaceDir = await mkdtemp(join(tmpdir(), 'wrote-usage-'))
})
afterAll(() => closeUsageDbs())

const now = new Date('2026-09-15T12:00:00Z')
const tokens = (input: number, output: number, cached = 0) => ({ inputTokens: input, outputTokens: output, cachedTokens: cached })

describe('recordAiCall', () => {
  it('stores each call with its estimated cost (own prices win, unknown models have none)', async () => {
    await updateAiSettings(workspaceDir, { prices: { 'openai-compatible:mine': { input: 1, output: 2 } } })
    expect((await recordAiCall(workspaceDir, { bookId: 'b1', feature: 'review' }, 'anthropic:claude-sonnet-5', tokens(1_000_000, 0, 1_000_000), now)).cost).toBeCloseTo(0.3)
    expect((await recordAiCall(workspaceDir, { bookId: 'b1', feature: 'assistant' }, 'openai-compatible:mine', tokens(1_000_000, 1_000_000), now)).cost).toBeCloseTo(3)
    expect((await recordAiCall(workspaceDir, { bookId: null, feature: 'assistant' }, 'openai-compatible:other', tokens(10, 10), now)).cost).toBeNull()
  })

  it('warns the book once when the month crosses 80% and 100% of the budget', async () => {
    await updateAiSettings(workspaceDir, { monthlyBudget: 10, prices: { 'openai-compatible:m': { input: 1, output: 0 } } })
    const events: BudgetStatus[] = []
    const stop = subscribeUsageEvents('b1', status => events.push(status))
    const call = (millions: number) => recordAiCall(workspaceDir, { bookId: 'b1', feature: 'review' }, 'openai-compatible:m', tokens(millions * 1_000_000, 0), now)
    await call(7)
    await call(1.5)
    await call(0.1)
    await call(2)
    stop()
    expect(events.map(e => [e.level, e.spent])).toEqual([[80, 8.5], [100, expect.closeTo(10.6)]])
  })
})

describe('usageReport', () => {
  it('sums tokens and cost by feature, model, book and month', async () => {
    await recordAiCall(workspaceDir, { bookId: 'b1', feature: 'review' }, 'anthropic:claude-sonnet-5', tokens(1_000_000, 100_000), now)
    await recordAiCall(workspaceDir, { bookId: 'b1', feature: 'autocomplete' }, 'ollama:llama3.2', tokens(500, 20), now)
    await recordAiCall(workspaceDir, { bookId: 'b2', feature: 'review' }, 'anthropic:claude-sonnet-5', tokens(1_000_000, 0), new Date('2026-08-02T00:00:00Z'))
    await recordAiCall(workspaceDir, { bookId: 'b2', feature: 'review' }, 'anthropic:claude-sonnet-5', tokens(1_000_000, 0), new Date('2025-01-02T00:00:00Z'))
    const report = await usageReport(workspaceDir, { months: 6 }, new Map([['b1', 'Harbor']]), now)
    expect(report.totals).toMatchObject({ calls: 3, inputTokens: 2_000_500, outputTokens: 100_020, cost: expect.closeTo(7.5) })
    expect(report.byFeature.map(g => [g.key, g.calls])).toEqual([['review', 2], ['autocomplete', 1]])
    expect(report.byBook.map(g => g.label)).toEqual(['Harbor', 'b2'])
    expect(report.byMonth.map(g => g.key)).toEqual(['2026-08', '2026-09'])
    expect(report.budget).toMatchObject({ month: '2026-09', budget: null, level: 0, spent: expect.closeTo(4.5) })
    expect((await usageReport(workspaceDir, { months: 1, bookId: 'b2' }, new Map(), now)).totals.calls).toBe(0)
  })

  it('computes budget levels', () => {
    expect([budgetLevel(5, 10), budgetLevel(8, 10), budgetLevel(10, 10), budgetLevel(99, null)]).toEqual([0, 80, 100, 0])
  })
})
