import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import type { Job } from '#shared/schemas/jobs'
import { bookKeys } from '~/queries/keys'
import { useCodexScan } from './useCodexScan'

const job = (status: Job['status'], result: unknown = null): Job => ({ id: 'job_1', kind: 'extract_codex', title: 'Scan', status, progress: 0, message: null, error: null, result, attempts: 0, maxAttempts: 2, createdAt: '', startedAt: null, finishedAt: null })
const started: unknown[] = []
registerEndpoint('/api/books/scan-book/structure', () => [{ id: 'prt_1', type: 'part', title: 'One', path: 'p', wordCount: 0, children: [{ id: 'chp_1', type: 'chapter', title: 'Harbor', path: 'c', wordCount: 0, children: [] }] }])
registerEndpoint('/api/books/scan-book/jobs', () => [])
registerEndpoint('/api/books/scan-book/codex/extract', { method: 'POST', handler: async (event) => {
  started.push(await readBody(event))
  return job('queued')
} })

describe('useCodexScan', () => {
  it('scans the chosen chapter in the background and opens the review when proposals arrive', async () => {
    const finished = vi.fn()
    let scan!: ReturnType<typeof useCodexScan>
    let cache!: ReturnType<typeof useQueryCache>
    await mountSuspended(defineComponent({
      setup() {
        cache = useQueryCache()
        scan = useCodexScan('scan-book', finished)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(scan.targets.value).toEqual([{ label: 'One › Harbor', value: 'chp_1' }]))
    scan.target.value = 'chp_1'
    await scan.start()
    expect(started).toEqual([{ entryId: 'chp_1' }])
    cache.setQueryData(bookKeys.jobs('scan-book'), [job('running')])
    await nextTick()
    expect(scan.scanning.value).toBe(true)
    cache.setQueryData(bookKeys.jobs('scan-book'), [job('succeeded', { proposals: 3 })])
    await vi.waitFor(() => expect(finished).toHaveBeenCalledOnce())
    expect(scan.scanning.value).toBe(false)
  })
})
