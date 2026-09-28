import type { AiCall, BudgetStatus, TokenUsage, UsageGroup, UsageQuery, UsageReport } from '#shared/schemas/usage'
import { estimateCost, priceFor } from '../ai/pricing'
import { insertCall, spentSince, usageBy, usageDb, usageTotals } from '../db/usage'
import { publishUsageEvent } from '../utils/book-events'
import { loadAiConfig } from './ai-settings'

export interface UsageScope {
  bookId: string | null
  feature: string
}

const monthStart = (now: Date, back = 0) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1)).toISOString()

/** The budget level reached by a spend: 100, 80 or 0. */
export const budgetLevel = (spent: number, budget: number | null): BudgetStatus['level'] =>
  !budget ? 0 : spent >= budget ? 100 : spent >= budget * 0.8 ? 80 : 0

export async function budgetStatus(workspaceDir: string, now = new Date()): Promise<BudgetStatus> {
  const [config, db] = await Promise.all([loadAiConfig(workspaceDir), usageDb(workspaceDir)])
  const spent = await spentSince(db, monthStart(now))
  const budget = config.settings.monthlyBudget
  return { month: monthStart(now).slice(0, 7), spent, budget, level: budgetLevel(spent, budget) }
}

/**
 * Records one model call with its estimated cost. When it pushes the month's spend over 80% or 100% of
 * the budget, the book's clients get a `usage` event (a warning toast).
 */
export async function recordAiCall(workspaceDir: string, scope: UsageScope, ref: string, usage: TokenUsage, now = new Date()): Promise<AiCall> {
  const [config, db] = await Promise.all([loadAiConfig(workspaceDir), usageDb(workspaceDir)])
  const call: AiCall = { at: now.toISOString(), bookId: scope.bookId, feature: scope.feature, model: ref, ...usage, cost: estimateCost(usage, priceFor(ref, config.settings.prices)) }
  const budget = config.settings.monthlyBudget
  const before = budget && call.cost ? await spentSince(db, monthStart(now)) : 0
  await insertCall(db, call)
  if (budget && call.cost && scope.bookId) {
    const spent = before + call.cost
    const level = budgetLevel(spent, budget)
    if (level > budgetLevel(before, budget)) publishUsageEvent(scope.bookId, { month: monthStart(now).slice(0, 7), spent, budget, level })
  }
  return call
}

/** Tokens and estimated cost of the last `months` months, by feature, model, book and month. */
export async function usageReport(workspaceDir: string, query: UsageQuery, bookTitles: Map<string, string> = new Map(), now = new Date()): Promise<UsageReport> {
  const db = await usageDb(workspaceDir)
  const since = monthStart(now, query.months - 1)
  const [totals, byFeature, byModel, byBook, byMonth, budget] = await Promise.all([
    usageTotals(db, since, query.bookId),
    usageBy(db, 'feature', since, query.bookId),
    usageBy(db, 'model', since, query.bookId),
    usageBy(db, 'book', since, query.bookId),
    usageBy(db, 'month', since, query.bookId),
    budgetStatus(workspaceDir, now),
  ])
  const labelBooks = (group: UsageGroup) => ({ ...group, label: group.key ? bookTitles.get(group.key) ?? group.key : 'No book' })
  return { totals, byFeature, byModel, byBook: byBook.map(labelBooks), byMonth, budget }
}
