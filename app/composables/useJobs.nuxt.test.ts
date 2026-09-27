import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { Job } from '#shared/schemas/jobs'
import { useJobs } from './useJobs'

const job = (id: string, status: Job['status']): Job =>
  ({ id, kind: 'reindex', title: 'Rebuild search index', status, progress: 0, message: null, error: null, result: null, attempts: 0, maxAttempts: 1, createdAt: `2026-01-01T00:00:0${id.length}Z`, startedAt: null, finishedAt: null })

registerEndpoint('/api/books/jb/jobs', { method: 'GET', handler: () => [job('old', 'succeeded')] })
registerEndpoint('/api/books/jb/jobs', { method: 'POST', handler: () => job('newer', 'queued') })
registerEndpoint('/api/books/jb/jobs/newer/cancel', { method: 'POST', handler: () => job('newer', 'cancelled') })

describe('useJobs', () => {
  it('lists jobs, adds enqueued ones and updates cancelled ones', async () => {
    let api!: ReturnType<typeof useJobs>
    await mountSuspended(defineComponent({
      setup() {
        api = useJobs('jb')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.jobs.value.map(j => j.id)).toEqual(['old']))
    await api.enqueue('reindex')
    expect(api.jobs.value.map(j => [j.id, j.status])).toEqual([['newer', 'queued'], ['old', 'succeeded']])
    expect(api.active.value).toHaveLength(1)
    await api.cancel('newer')
    expect(api.jobs.value[0]?.status).toBe('cancelled')
    expect(api.active.value).toHaveLength(0)
  })
})
