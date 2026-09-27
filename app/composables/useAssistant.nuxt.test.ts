import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ChatThread } from '#shared/schemas/chat'
import { useAssistant } from './useAssistant'

const thread = (id: string, title: string): ChatThread => ({ id, title, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' })
let threads = [thread('thr_latest', 'Harbor'), thread('thr_older', 'Mara')]
const deleted: string[] = []

registerEndpoint('/api/books/as', () => ({ id: 'as', title: 'Book' }))
registerEndpoint('/api/books/as/chat/threads', { method: 'GET', handler: () => threads })
registerEndpoint('/api/books/as/chat/threads/thr_latest/messages', () => [{ id: 'm1', role: 'user', parts: [{ type: 'text', text: 'Where is the harbor?' }] }])
registerEndpoint('/api/books/as/chat/threads/thr_older/messages', () => [])
registerEndpoint('/api/books/as/chat/threads/thr_latest', {
  method: 'DELETE',
  handler: () => {
    deleted.push('thr_latest')
    threads = threads.filter(t => t.id !== 'thr_latest')
    return null
  },
})

describe('useAssistant', () => {
  it('continues the latest thread, switches threads, starts new ones and deletes', async () => {
    let api!: ReturnType<typeof useAssistant>
    await mountSuspended(defineComponent({
      setup() {
        api = useAssistant('as')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(api.messages.value.map(m => m.id)).toEqual(['m1']))
    expect(api.threadId.value).toBe('thr_latest')
    expect(api.contextChips.value[0]).toMatchObject({ label: 'Book' })

    await api.open('thr_older')
    expect(api.messages.value).toEqual([])
    await api.newThread()
    expect(api.threadId.value).toBeNull()

    await api.open('thr_latest')
    await api.remove('thr_latest')
    expect(deleted).toEqual(['thr_latest'])
    expect(api.threadId.value).toBeNull()
    expect(api.status.value).toBe('ready')
  })
})
