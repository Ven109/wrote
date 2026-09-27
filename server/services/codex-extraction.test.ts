import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { textModel } from '../../test/utils/mock-model'
import { createTestWorkspace } from '../../test/utils/workspace'
import type { ExtractionOutput } from '../codex/extraction'
import { listCodex } from './codex'
import { extractWith, manuscriptText, scanForCodex } from './codex-extraction'
import { listCodexProposals, resolveCodexProposal } from './codex-proposals'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
beforeEach(async () => {
  book = await openBook(await createTestWorkspace(), 'sample-book')
})
afterEach(() => closeAllBooks())

const HARBOR = 'chp_harb0r0001'
const output: ExtractionOutput = {
  entries: [
    { name: 'Mara', type: 'character', existingId: 'cdx_mara000001', aliases: [], facts: [{ field: 'age', value: '34' }], description: '', evidence: ['Mara'] },
    { name: 'The Lantern', type: 'place', existingId: null, aliases: [], facts: [{ field: 'atmosphere', value: 'hostile' }], description: 'A harbour tavern.', evidence: ['The tide was out'] },
    { name: 'Invented', type: 'character', existingId: null, aliases: [], facts: [], description: '', evidence: ['never written'] },
  ],
}
const scan = (model = textModel(JSON.stringify(output))) => scanForCodex(book, HARBOR, { extract: extractWith(model), model: 'ollama:tiny', author: { kind: 'assistant', name: 'Scan chapter' } })

describe('codex extraction', () => {
  it('collects a chapter\'s scenes in reading order', async () => {
    const { title, text } = await manuscriptText(book, HARBOR)
    expect(title).toBe('The Harbor')
    expect(text.indexOf('## Arrival')).toBeLessThan(text.indexOf('## The Map'))
  })

  it('stores verified proposals as pending, replacing an earlier scan', async () => {
    const model = textModel(JSON.stringify(output))
    await scan(model)
    const proposals = await scan(model)
    expect(proposals.map(p => [p.action, p.title, p.status])).toEqual([['update', 'Mara Velden', 'pending'], ['create', 'The Lantern', 'pending']])
    expect(await listCodexProposals(book, { status: 'pending' })).toHaveLength(2)
    expect(JSON.stringify(model.prompts[0])).toContain('cdx_mara000001: Mara Velden')
  })

  it('creates or updates codex entries only when accepted, with the author\'s edits', async () => {
    const [update, create] = await scan()
    await resolveCodexProposal(book, create!.id, { status: 'accepted', edits: { title: 'The Lantern Inn' } })
    await resolveCodexProposal(book, update!.id, { status: 'rejected' })
    const places = await listCodex(book, { type: 'place' })
    expect(places.map(p => p.title)).toContain('The Lantern Inn')
    const inn = await book.repository.read(places.find(p => p.title === 'The Lantern Inn')!.path)
    expect(inn.frontmatter).toMatchObject({ atmosphere: 'hostile' })
    expect(inn.body).toContain('A harbour tavern.')
    expect((await book.repository.read('codex/characters/mara-velden.md')).frontmatter).not.toHaveProperty('age')
    await expect(resolveCodexProposal(book, create!.id, { status: 'rejected' })).rejects.toThrow('already resolved')
  })

  it('adds new facts to an existing entry on accept', async () => {
    const [update] = await scan()
    await resolveCodexProposal(book, update!.id, { status: 'accepted', edits: {} })
    expect((await book.repository.read('codex/characters/mara-velden.md')).frontmatter).toMatchObject({ age: '34', role: 'protagonist' })
  })
})
