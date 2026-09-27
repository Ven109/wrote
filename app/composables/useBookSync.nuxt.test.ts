import { mountSuspended } from '@nuxt/test-utils/runtime'
import { useQueryCache } from '@pinia/colada'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { bookKeys } from '~/queries/keys'
import { useBookSync } from './useBookSync'

type Listener = (message: MessageEvent<string>) => void

class FakeEventSource {
  static last: FakeEventSource | null = null
  listeners = new Map<string, Listener[]>()
  constructor(public url: string) {
    FakeEventSource.last = this
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  emit(type: string, data: unknown = {}) {
    this.listeners.get(type)?.forEach(listener => listener(new MessageEvent(type, { data: JSON.stringify(data) })))
  }

  close() {}
}

beforeEach(() => vi.stubGlobal('EventSource', FakeEventSource))
afterEach(() => vi.unstubAllGlobals())

async function mountSync() {
  let cache!: ReturnType<typeof useQueryCache>
  await mountSuspended(defineComponent({
    setup() {
      cache = useQueryCache()
      useBookSync('demo')
      return () => h('div')
    },
  }))
  return vi.spyOn(cache, 'invalidateQueries')
}

describe('useBookSync', () => {
  it('refreshes the book when the event stream (re)connects, so missed events do not leave stale data', async () => {
    const invalidate = await mountSync()
    expect(FakeEventSource.last?.url).toBe('/api/books/demo/events')
    FakeEventSource.last!.emit('ready')
    expect(invalidate).toHaveBeenCalledWith({ key: bookKeys.book('demo') })
  })

  it('refreshes the suggestions of an entry when they change', async () => {
    const invalidate = await mountSync()
    FakeEventSource.last!.emit('suggestion', { entryId: 'scn_1' })
    expect(invalidate).toHaveBeenCalledWith({ key: bookKeys.entrySuggestions('demo', 'scn_1') })
  })

  it('keeps the approvals cache current from approval events', async () => {
    let cache!: ReturnType<typeof useQueryCache>
    await mountSuspended(defineComponent({
      setup() {
        cache = useQueryCache()
        useBookSync('demo')
        return () => h('div')
      },
    }))
    const approval = { id: 'apr_1', bookId: 'demo' }
    FakeEventSource.last!.emit('approval', { approval, state: 'pending' })
    expect(cache.getQueryData(bookKeys.approvals('demo'))).toEqual([approval])
    FakeEventSource.last!.emit('approval', { approval, state: 'expired' })
    expect(cache.getQueryData(bookKeys.approvals('demo'))).toEqual([])
  })
})
