import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { openStateDb, type StateDb } from './client'
import { createThread, deleteThread, getThread, listThreads, saveThreadMessages, threadMessages } from './chat'

let db: StateDb
const t = (s: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, s))

beforeEach(async () => {
  db = await openStateDb(':memory:')
})
afterEach(() => db.$client.close())

describe('chat store', () => {
  it('creates threads and lists the most recently updated first', async () => {
    const a = await createThread(db, 'New chat', t(0))
    const b = await createThread(db, 'New chat', t(1))
    await saveThreadMessages(db, a.id, [{ id: 'm1', role: 'user' }], { title: 'Harbor', now: t(2) })
    expect((await listThreads(db)).map(thread => [thread.id, thread.title])).toEqual([[a.id, 'Harbor'], [b.id, 'New chat']])
  })

  it('replaces messages in order and deletes them with the thread', async () => {
    const thread = await createThread(db, 'x', t(0))
    await saveThreadMessages(db, thread.id, [{ id: 'm1', role: 'user' }], { now: t(1) })
    await saveThreadMessages(db, thread.id, [{ id: 'm1', role: 'user' }, { id: 'm2', role: 'assistant', parts: [] } as never], { now: t(2) })
    expect(await threadMessages(db, thread.id)).toEqual([{ id: 'm1', role: 'user' }, { id: 'm2', role: 'assistant', parts: [] }])
    expect(await deleteThread(db, thread.id)).toBe(true)
    expect(await getThread(db, thread.id)).toBeNull()
    expect(await threadMessages(db, thread.id)).toEqual([])
    expect(await deleteThread(db, thread.id)).toBe(false)
  })
})
