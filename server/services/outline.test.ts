import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseOutline } from '#shared/utils/outline-format'
import { createTestWorkspace } from '../../test/utils/workspace'
import { createSceneForBeat, listBeats, readOutline, updateOutline } from './outline'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

const titles = (acts: { title: string, beats: { title: string }[] }[]) => acts.map(act => `${act.title}: ${act.beats.map(b => b.title).join(' | ')}`)

describe('outline service', () => {
  it('reads the fixture outline and round-trips it without a diff', async () => {
    const before = await book.repository.readRaw('outline.md')
    const { outline } = await readOutline(book)
    expect(titles(outline.acts)).toEqual(['Act One: Return: Mara returns to Hollow Bay | She finds her father\'s map', 'Act Two: The Guild: The Guild makes an offer'])
    await updateOutline(book, [{ op: 'setNotes', notes: outline.notes }])
    expect(await book.repository.readRaw('outline.md')).toBe(before)
  })

  it('moves a beat to another act, writes the file and updates the index', async () => {
    const { hash } = await readOutline(book)
    await updateOutline(book, [{ op: 'moveBeat', beatId: 'bt_themap0001', actId: 'act_tw00000001', index: 0 }], hash)
    expect(titles(parseOutline((await book.repository.read('outline.md')).body).acts)).toEqual(['Act One: Return: Mara returns to Hollow Bay', 'Act Two: The Guild: She finds her father\'s map | The Guild makes an offer'])
    expect(await listBeats(book, { sceneId: 'scn_themap0001' })).toMatchObject([{ id: 'bt_themap0001', actTitle: 'Act Two: The Guild', scenes: ['scn_themap0001'] }])
    expect((await listBeats(book)).map(beat => beat.id)).toEqual(['bt_arr1va0001', 'bt_themap0001', 'bt_0ffer00001'])
  })

  it('refuses changes based on an outdated file and unknown beats', async () => {
    await expect(updateOutline(book, [{ op: 'setNotes', notes: 'x' }], 'stale')).rejects.toThrow('changed on disk')
    await expect(updateOutline(book, [{ op: 'deleteBeat', beatId: 'bt_nope' }])).rejects.toThrow('Unknown beat')
  })

  it('gives hand-written beats ids and saves them', async () => {
    const entry = await book.repository.read('outline.md')
    await book.repository.write('outline.md', { frontmatter: entry.frontmatter, body: '## Setup\n\n### A storm\nWind.\n' })
    const { outline } = await readOutline(book)
    expect(outline.acts[0]!.beats[0]!.id).toMatch(/^bt_/)
    expect(await book.repository.readRaw('outline.md')).toContain(`<!-- wrote:beat id=${outline.acts[0]!.beats[0]!.id} -->`)
  })
})

describe('beats and scenes', () => {
  it('creates a scene from a beat, prefilled and linked on both sides', async () => {
    const { sceneId, path } = await createSceneForBeat(book, 'bt_0ffer00001', 'chp_gu1ld00001')
    const scene = await book.repository.read(path)
    expect(scene.frontmatter).toMatchObject({ title: 'The Guild makes an offer', synopsis: 'They want the map, and they will pay.' })
    expect((await readOutline(book)).outline.acts[1]!.beats[0]!.scenes).toEqual([sceneId])
    expect(await listBeats(book, { sceneId })).toMatchObject([{ id: 'bt_0ffer00001' }])
    await expect(createSceneForBeat(book, 'bt_missing000', 'chp_gu1ld00001')).rejects.toThrow('not found')
  })
})
