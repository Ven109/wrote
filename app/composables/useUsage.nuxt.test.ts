import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { UsageGroup, UsageReport } from '#shared/schemas/usage'
import { useUsage } from './useUsage'

const group = (key: string, cost: number): UsageGroup => ({ key, label: key, calls: 2, inputTokens: 1000, outputTokens: 100, cachedTokens: 0, cost, unpriced: 0 })
const report = (months: number): UsageReport => ({
  totals: group('all', 3),
  byFeature: [group('review', 2), group('autocomplete', 1)],
  byModel: [group('anthropic:claude-sonnet-5', 3)],
  byBook: [{ ...group('b1', 3), label: 'Harbor' }],
  byMonth: Array.from({ length: months > 1 ? 2 : 1 }, (_, index) => group(`2026-0${8 + index}`, 1)),
  budget: { month: '2026-09', spent: 8, budget: 10, level: 80 },
})
const patches: unknown[] = []
registerEndpoint('/api/settings/usage', event => report(Number(getQuery(event).months)))
registerEndpoint('/api/settings/ai', { method: 'PATCH', handler: async (event) => {
  patches.push(await readBody(event))
  return { providers: [], models: {}, configured: true, embeddings: false, summaries: { enabled: false, dailyTokenBudget: 1 }, autocomplete: false, provenanceThreshold: 0.5, monthlyBudget: 20, prices: {} }
} })

async function mount() {
  let usage!: ReturnType<typeof useUsage>
  await mountSuspended(defineComponent({
    setup() {
      usage = useUsage()
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(usage.report.value).toBeTruthy())
  return usage
}

describe('useUsage', () => {
  it('breaks usage down with readable labels and relative bars', async () => {
    const usage = await mount()
    const features = usage.sections.value.find(section => section.id === 'feature')!
    expect(features.groups.map(g => [g.label, g.share])).toEqual([['Reviews', 100], ['Autocomplete', 50]])
    expect(usage.budgetShare.value).toBe(80)
    usage.months.value = 1
    await vi.waitFor(() => expect(usage.sections.value.find(section => section.id === 'month')!.groups).toHaveLength(1))
  })

  it('saves the monthly budget', async () => {
    const usage = await mount()
    await usage.setBudget(20)
    await usage.setBudget(null)
    expect(patches).toEqual([{ monthlyBudget: 20 }, { monthlyBudget: null }])
  })
})
