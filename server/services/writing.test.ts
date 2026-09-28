import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { goalProgress, recordWriting } from './writing'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  await closeAllBooks()
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterAll(() => closeAllBooks())

const scene = (before: string | null, after: string | null, path = 'manuscript/01-part-one/01-the-harbor/01-arrival.md') => ({ path, type: 'scene', before, after })
const at = (iso: string) => new Date(iso)

describe('writing sessions', () => {
  it('groups edits into sessions with added, deleted and net words', async () => {
    await recordWriting(book, scene('One.\n', 'One.\n\nTwo three four.\n'), at('2026-09-28T09:00:00'))
    const session = await recordWriting(book, scene('One.\n\nTwo three four.\n', 'One.\n\nTwo three.\n'), at('2026-09-28T09:20:00'))
    expect(session).toMatchObject({ added: 3, deleted: 1, net: 2, startedAt: at('2026-09-28T09:00:00').toISOString() })
    const later = await recordWriting(book, scene('A.\n', 'A.\n\nB c.\n'), at('2026-09-28T10:00:00'))
    expect(later!.id).not.toBe(session!.id)
    expect(await recordWriting(book, { ...scene('x', 'y'), type: 'note' })).toBeNull()
  })

  it('does not count cut and paste between scenes as writing', async () => {
    await recordWriting(book, scene('Keep.\n\nThe tide came in fast.\n', 'Keep.\n'), at('2026-09-28T09:00:00'))
    const session = await recordWriting(book, scene('Other.\n', 'Other.\n\nThe tide came in fast.\n', 'manuscript/01-part-one/01-the-harbor/02-the-map.md'), at('2026-09-28T09:01:00'))
    expect(session).toMatchObject({ added: 0, net: 0 })
  })

  it('records edits saved through the repository', async () => {
    const path = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
    const entry = await book.repository.read(path)
    await book.repository.write(path, { frontmatter: entry.frontmatter, body: `${entry.body}\nFive new words right here.\n` }, entry.hash)
    await book.settle()
    expect((await goalProgress(book)).today).toMatchObject({ added: 5, net: 5 })
  })
})

describe('goalProgress', () => {
  it('derives the daily target, streaks and words over time', async () => {
    await book.repository.writeConfig({ ...(await book.repository.readConfig()), goals: { target: 10_000, deadline: '2026-10-07' } })
    await recordWriting(book, scene('', 'One two three.\n'), at('2026-09-27T20:00:00'))
    await recordWriting(book, scene('', 'Four five.\n'), at('2026-09-28T08:00:00'))
    const progress = await goalProgress(book, at('2026-09-28T12:00:00'))
    const total = progress.totalWords
    expect(progress).toMatchObject({ target: 10_000, deadline: '2026-10-07', daysLeft: 10, remaining: 10_000 - total, streak: { current: 2, longest: 2 } })
    expect(progress.dailyTarget).toBe(Math.ceil((10_000 - (total - 2)) / 10))
    expect(progress.history).toEqual([{ day: '2026-09-27', words: total - 2 }, { day: '2026-09-28', words: total }])
    expect(progress.today).toMatchObject({ day: '2026-09-28', added: 2 })
  })
})
