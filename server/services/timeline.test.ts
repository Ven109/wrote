import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { createCodexEntry, updateCodexEntry } from './codex'
import { buildTimeline, moveOnTimeline } from './timeline'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

async function setTimeline(path: string, timeline: string | null) {
  const entry = await book.repository.read(path)
  await book.repository.write(path, { frontmatter: { ...entry.frontmatter, timeline: timeline ?? undefined }, body: entry.body }, entry.hash)
  await book.settle()
}

describe('buildTimeline', () => {
  it('orders dated scenes and events, lists undated ones, and knows who and where', async () => {
    await setTimeline('manuscript/01-part-one/01-the-harbor/02-the-map.md', 'Day 2, evening')
    await setTimeline('manuscript/01-part-one/02-the-drowned-guild/01-the-meeting.md', null)
    const storm = await createCodexEntry(book, { type: 'event', title: 'The great storm' })
    await updateCodexEntry(book, { path: storm.path, fields: { date: 'Day 2', end: 'Day 4', participants: ['cdx_mara000001'] } })
    await book.settle()
    const view = await buildTimeline(book)
    expect(view.items.map(item => [item.title, item.date])).toEqual([['Arrival', 'Day 1'], ['The great storm', 'Day 2'], ['The Map', 'Day 2, evening']])
    expect(view.items[0]).toMatchObject({ kind: 'scene', group: 'The Harbor', pov: 'Mara Velden', location: 'Hollow Bay', characters: ['cdx_mara000001'], places: ['cdx_h0llowbay1'] })
    expect(view.items[1]).toMatchObject({ kind: 'event', group: 'Events', characters: ['cdx_mara000001'], endKey: 3 })
    expect(view.undated.map(item => item.title)).toContain('The Meeting')
    expect(view.people).toEqual([{ id: 'cdx_mara000001', title: 'Mara Velden' }])
    expect(view.locations).toEqual([{ id: 'cdx_h0llowbay1', title: 'Hollow Bay' }])
  })

  it('filters by character, place and range, using the book\'s calendar', async () => {
    const config = await book.repository.readConfig()
    await book.repository.writeConfig({ ...config, timeline: { start: '1890-05-10', calendars: [] } })
    await setTimeline('manuscript/01-part-one/02-the-drowned-guild/01-the-meeting.md', '1890-05-15')
    await setTimeline('manuscript/01-part-one/01-the-harbor/02-the-map.md', '1890-05-11')
    const all = await buildTimeline(book)
    expect(all.items.map(item => item.date)).toEqual(['Day 1', '1890-05-11', '1890-05-15'])
    expect((await buildTimeline(book, { from: '1890-05-12' })).items.map(item => item.date)).toEqual(['1890-05-15'])
    expect((await buildTimeline(book, { to: 'Day 2' })).items.map(item => item.date)).toEqual(['Day 1', '1890-05-11'])
    expect((await buildTimeline(book, { place: 'cdx_h0llowbay1' })).items.map(item => item.title)).toContain('Arrival')
    expect((await buildTimeline(book, { character: 'cdx_nobody0001' })).items).toEqual([])
  })
})

describe('moveOnTimeline', () => {
  it('writes the new date in the format it was written in, moving an event\'s end along', async () => {
    expect(await moveOnTimeline(book, 'scn_arr1val001', 3.75)).toEqual({ date: 'Day 4', end: null })
    expect((await book.repository.read('manuscript/01-part-one/01-the-harbor/01-arrival.md')).frontmatter.timeline).toBe('Day 4')
    const storm = await createCodexEntry(book, { type: 'event', title: 'Storm' })
    await updateCodexEntry(book, { path: storm.path, fields: { date: '1890-05-12', end: '1890-05-14' } })
    await book.settle()
    const view = await buildTimeline(book)
    const key = view.items.find(item => item.title === 'Storm')!.key
    expect(await moveOnTimeline(book, storm.id, key + 3)).toEqual({ date: '1890-05-15', end: '1890-05-17' })
  })

  it('refuses entries that are not on the timeline or have no readable date', async () => {
    await expect(moveOnTimeline(book, 'cdx_mara000001', 1)).rejects.toThrow(/Only scenes and events/)
    await setTimeline('manuscript/01-part-one/01-the-harbor/01-arrival.md', 'the next morning')
    await expect(moveOnTimeline(book, 'scn_arr1val001', 1)).rejects.toThrow(/no date/)
    await expect(moveOnTimeline(book, 'scn_missing001', 1)).rejects.toThrow(/scn_missing001/)
  })
})
