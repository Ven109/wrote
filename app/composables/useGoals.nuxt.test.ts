import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { GoalProgress } from '#shared/schemas/writing'
import { useGoals } from './useGoals'

const progress: GoalProgress = {
  totalWords: 25_000, target: 50_000, deadline: '2026-10-27', remaining: 25_000, daysLeft: 30, dailyTarget: 850,
  today: { day: '2026-09-28', added: 500, deleted: 75, net: 425, minutes: 40 },
  streak: { current: 3, longest: 9 }, days: [], history: [], sessions: [],
}
const patches: unknown[] = []
registerEndpoint('/api/books/goal-book/goals', () => progress)
registerEndpoint('/api/books/goal-book', { method: 'GET', handler: () => ({ id: 'goal-book', title: 'Goal book' }) })
registerEndpoint('/api/books/goal-book', { method: 'PATCH', handler: async (event) => {
  patches.push(await readBody(event))
  return { id: 'goal-book', title: 'Goal book' }
} })

describe('useGoals', () => {
  it('reports today and the book against their targets and saves the goal', async () => {
    let goals!: ReturnType<typeof useGoals>
    await mountSuspended(defineComponent({
      setup() {
        goals = useGoals('goal-book')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(goals.progress.value).toBeTruthy())
    expect(goals.todayPercent.value).toBe(50)
    expect(goals.bookPercent.value).toBe(50)
    await goals.setGoal(80_000, '2026-12-31')
    expect(patches.at(-1)).toEqual({ goals: { target: 80_000, deadline: '2026-12-31' } })
  })
})
