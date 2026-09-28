import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { runTool, ToolError, type ToolContext } from '../tools/define'
import { proposeOutlineChangesTool } from '../tools/outline-tools'
import { readOutline } from './outline'
import { createOutlineProposals, listOutlineProposals, resolveOutlineProposal } from './outline-proposals'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let book: BookContext
let context: ToolContext
beforeEach(async () => {
  const workspaceDir = await createTestWorkspace()
  book = await openBook(workspaceDir, 'sample-book')
  context = { workspaceDir, book, caller: { kind: 'mcp', name: 'Claude Code' } }
})
afterEach(() => closeAllBooks())

const beatTitles = async () => (await readOutline(book)).outline.acts.map(act => act.beats.map(beat => beat.title))

describe('outline proposals', () => {
  it('stores proposals from an agent without touching outline.md', async () => {
    const before = await book.repository.readRaw('outline.md')
    const result = await runTool(proposeOutlineChangesTool, {
      source: 'Bridge',
      proposals: [
        { change: { kind: 'addBeat', actId: 'act_0ne0000001', afterBeatId: 'bt_arr1va0001', title: 'Night at the lighthouse', summary: 'She cannot sleep.' }, rationale: 'Slows down before the map.' },
        { change: { kind: 'note', text: 'Why does the Guild wait so long?' } },
      ],
    }, context) as { proposals: { id: string }[] }
    expect(result.proposals).toHaveLength(2)
    expect(await book.repository.readRaw('outline.md')).toBe(before)
    expect(await listOutlineProposals(book, { status: 'pending' })).toMatchObject([
      { source: 'Bridge', rationale: 'Slows down before the map.', author: { kind: 'mcp', name: 'Claude Code' }, change: { kind: 'addBeat' } },
      { source: 'Bridge', change: { kind: 'note' } },
    ])
  })

  it('refuses proposals for unknown acts or beats', async () => {
    await expect(runTool(proposeOutlineChangesTool, { proposals: [{ change: { kind: 'updateBeat', beatId: 'bt_nope000001', title: 'X' } }] }, context)).rejects.toThrow(ToolError)
    expect(await listOutlineProposals(book)).toEqual([])
  })

  it('accepting applies the change (with edits); rejecting only records the decision', async () => {
    const [add, note] = await createOutlineProposals(book, [
      { change: { kind: 'addBeat', actId: 'act_0ne0000001', afterBeatId: 'bt_arr1va0001', title: 'Night', summary: '' }, rationale: '' },
      { change: { kind: 'note', text: 'Plot hole.' }, rationale: '' },
    ], { author: { kind: 'assistant', name: 'Assistant' }, source: 'Test' })
    const accepted = await resolveOutlineProposal(book, add!.id, { status: 'accepted', edits: { title: 'Night at the lighthouse' } })
    expect(accepted.proposal).toMatchObject({ status: 'accepted', resolvedAt: expect.any(String) })
    expect((await beatTitles())[0]).toEqual(['Mara returns to Hollow Bay', 'Night at the lighthouse', 'She finds her father\'s map'])
    const notesBefore = (await readOutline(book)).outline.notes
    await resolveOutlineProposal(book, note!.id, { status: 'rejected' })
    expect((await readOutline(book)).outline.notes).toBe(notesBefore)
    expect(await listOutlineProposals(book, { status: 'pending' })).toEqual([])
    await expect(resolveOutlineProposal(book, note!.id, { status: 'accepted', edits: {} })).rejects.toThrow(/already resolved/)
  })

  it('cannot accept a beat whose act was deleted since', async () => {
    const [add] = await createOutlineProposals(book, [{ change: { kind: 'addBeat', actId: 'act_tw00000001', afterBeatId: null, title: 'X', summary: '' }, rationale: '' }], { author: { kind: 'assistant', name: 'Assistant' } })
    const { updateOutline } = await import('./outline')
    await updateOutline(book, [{ op: 'deleteAct', actId: 'act_tw00000001' }])
    await expect(resolveOutlineProposal(book, add!.id, { status: 'accepted', edits: {} })).rejects.toThrow(/deleted/)
    expect(await listOutlineProposals(book, { status: 'pending' })).toHaveLength(1)
  })
})
