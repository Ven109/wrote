import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { applyChange } from '../db/indexer'
import { readProvenanceFile } from '../storage/provenance'
import { entryProvenance, locateProvenance, provenanceStats } from './provenance'
import { createSuggestion, resolveSuggestions } from './suggestions'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let workspace: string
let book: BookContext
const map = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'
const original = 'Her father\'s map was still in the drawer, folded along the same tired creases.'

async function writeMap(body: string) {
  await writeFile(join(book.root, map), `---\nid: scn_themap0001\ntitle: The Map\n---\n${body}\n`)
  await applyChange(book.db, book.repository, { kind: 'changed', path: map })
}

/** The assistant proposes, the author accepts (the editor applies the text, autosave writes it). */
async function acceptRewrite(find: string, replace: string) {
  const suggestion = await createSuggestion(book, { entryId: 'scn_themap0001', find, replace, author: { kind: 'assistant', name: 'AI · Rephrase' }, model: 'ollama:tiny' })
  await writeMap(original.replace(find, replace))
  await resolveSuggestions(book, { ids: [suggestion.id], status: 'accepted' })
}

beforeEach(async () => {
  workspace = await createTestWorkspace()
  book = await openBook(workspace, 'sample-book')
})
afterEach(() => closeAllBooks())

describe('locateProvenance', () => {
  const range = { text: 'the old ink had faded to brown', before: 'In the corner, ', after: '. She did not' }
  it('finds the passage as accepted or lightly edited, and drops rewritten or deleted ones', () => {
    expect(locateProvenance('In the corner, the old ink had faded to brown. She did not', range)).toMatchObject({ changed: 0 })
    const edited = locateProvenance('In the corner, the old ink had faded to a rusty brown. She did not', range)!
    expect(edited.changed).toBeCloseTo(2 / 9)
    expect(locateProvenance('In the corner, nothing was written at all anymore. She did not', range)).toBeNull()
    expect(locateProvenance('Something else entirely.', range)).toBeNull()
    expect(locateProvenance('In the corner, the old ink had faded to a rusty brown. She did not', range, 0.2)).toBeNull()
  })
})

describe('provenance of accepted AI text', () => {
  it('records accepted text in a sidecar and reports the AI-assisted share', async () => {
    await acceptRewrite('folded along the same tired creases', 'creased along the lines her father had worn into it')
    const sidecar = await readProvenanceFile(book.root, 'scn_themap0001')
    expect(sidecar.ranges).toEqual([expect.objectContaining({ text: 'creased along the lines her father had worn into it', model: 'ollama:tiny', author: { kind: 'assistant', name: 'AI · Rephrase' } })])
    const result = await entryProvenance(book, 'scn_themap0001')
    expect(result.ranges[0]).toMatchObject({ text: 'creased along the lines her father had worn into it', changed: 0, words: 10 })
    expect(result.stats).toEqual({ aiWords: 10, totalWords: 18, share: 10 / 18 })
  })

  it('survives a reload and external edits elsewhere', async () => {
    await acceptRewrite('folded along the same tired creases', 'creased along the lines her father had worn into it')
    await closeAllBooks()
    book = await openBook(workspace, 'sample-book')
    await writeMap(`A new first paragraph written in another editor.\n\n${original.replace('folded along the same tired creases', 'creased along the lines her father had worn into it')}`)
    expect((await entryProvenance(book, 'scn_themap0001')).ranges).toHaveLength(1)
  })

  it('clears the mark once the author rewrote the passage past the threshold', async () => {
    await acceptRewrite('folded along the same tired creases', 'creased along the lines her father had worn into it')
    await writeMap(original.replace('folded along the same tired creases', 'creased along the lines worn into it'))
    expect((await entryProvenance(book, 'scn_themap0001')).ranges[0]!.changed).toBeCloseTo(0.3)
    await writeMap(original.replace('folded along the same tired creases', 'still folded, untouched since that winter'))
    expect((await entryProvenance(book, 'scn_themap0001')).ranges).toEqual([])
    expect((await readProvenanceFile(book.root, 'scn_themap0001')).ranges).toEqual([])
  })

  it('rolls the share up to chapters, parts and the book', async () => {
    await acceptRewrite('folded along the same tired creases', 'creased along the lines her father had worn into it')
    const stats = await provenanceStats(book)
    expect(stats.entries.scn_themap0001!.aiWords).toBe(10)
    expect(stats.entries.chp_harb0r0001!.aiWords).toBe(10)
    expect(stats.entries.prt_part0ne001!.aiWords).toBe(10)
    expect(stats.book.aiWords).toBe(10)
    expect(stats.book.totalWords).toBeGreaterThan(stats.entries.chp_harb0r0001!.totalWords)
    expect(stats.entries.scn_arr1val001!.share).toBe(0)
  })
})
