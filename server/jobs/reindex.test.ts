import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Job } from '#shared/schemas/jobs'
import { createTestWorkspace } from '../../test/utils/workspace'
import { searchEntries } from '../db/queries'
import { closeAllBooks, openBook, type BookContext } from '../services/workspace'
import { subscribeJobEvents } from '../utils/book-events'

let book: BookContext

beforeAll(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

describe('reindex job', () => {
  it('rebuilds the index with progress events', async () => {
    const events: Job[] = []
    const unsubscribe = subscribeJobEvents(book.id, job => events.push(job))
    await book.db.$client.execute('DELETE FROM entries_fts')
    expect(await searchEntries(book.db, 'harbor')).toEqual([])

    const job = await book.jobs.enqueue('reindex')
    await book.jobs.idle()
    unsubscribe()

    expect(await book.jobs.get(job.id)).toMatchObject({ status: 'succeeded', result: { indexed: 13, removed: 0, errors: 0 } })
    expect(events.some(event => event.status === 'running' && event.progress > 0 && event.progress < 1)).toBe(true)
    expect((await searchEntries(book.db, 'harbor')).length).toBeGreaterThan(0)
  })
})
