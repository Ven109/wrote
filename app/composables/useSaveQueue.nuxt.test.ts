import { describe, expect, it } from 'vitest'
import { useSaveQueue } from './useSaveQueue'

const deferred = () => {
  let resolve!: (value: string) => void
  const promise = new Promise<string>(r => (resolve = r))
  return { promise, resolve }
}

describe('useSaveQueue', () => {
  it('runs saves for the same path one after another and tracks the latest body', async () => {
    const queue = useSaveQueue<string>()
    const order: string[] = []
    const first = deferred()
    const a = queue.enqueue('p', 'one', () => {
      order.push('start 1')
      return first.promise
    })
    const b = queue.enqueue('p', 'two', async () => {
      order.push('start 2')
      return 'second'
    })
    expect(queue.pendingBody('p')).toBe('two')
    await Promise.resolve()
    expect(order).toEqual(['start 1'])
    first.resolve('first')
    expect(await a).toBe('first')
    expect(await b).toBe('second')
    expect(order).toEqual(['start 1', 'start 2'])
    await Promise.resolve()
    expect(queue.isPending('p')).toBe(false)
  })

  it('keeps going after a failed save and runs other paths independently', async () => {
    const queue = useSaveQueue<string>()
    const failed = queue.enqueue('p', 'x', () => Promise.reject(new Error('boom')))
    const next = queue.enqueue('p', 'y', async () => 'ok')
    const other = queue.enqueue('q', 'z', async () => 'other')
    await expect(failed).rejects.toThrow('boom')
    expect(await next).toBe('ok')
    expect(await other).toBe('other')
  })
})
