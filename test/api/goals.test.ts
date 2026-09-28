import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { GoalProgress } from '#shared/schemas/writing'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const ARRIVAL = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
const inDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

describe('goals API', () => {
  it('sets a target and deadline and tracks today\'s writing against the daily target', async () => {
    const before = await $fetch<GoalProgress>('/api/books/sample-book/goals')
    expect(before).toMatchObject({ target: null, dailyTarget: null, today: { added: 0 } })
    await $fetch('/api/books/sample-book', { method: 'PATCH', body: { goals: { target: before.totalWords + 1000, deadline: inDays(9) } } })
    const doc = await $fetch<{ body: string }>('/api/books/sample-book/document', { query: { path: ARRIVAL } })
    await $fetch('/api/books/sample-book/document', { method: 'PUT', body: { path: ARRIVAL, body: `${doc.body}\nSix more words to count today.\n` } })
    await expect.poll(async () => (await $fetch<GoalProgress>('/api/books/sample-book/goals')).today.added).toBe(6)
    const goals = await $fetch<GoalProgress>('/api/books/sample-book/goals')
    expect(goals).toMatchObject({ daysLeft: 10, dailyTarget: 100, remaining: 994, streak: { current: 1 } })
  })

  it('validates goals', async () => {
    const res = await fetch('/api/books/sample-book', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ goals: { target: -5, deadline: 'soon' } }) })
    expect(res.status).toBe(400)
  })
})
