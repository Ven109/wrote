import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { z } from 'zod'
import { createTestWorkspace } from '../../test/utils/workspace'
import { defineWroteTool, runTool, type ToolContext } from '../tools/define'
import { createNoteTool, proposeEditTool } from '../tools/write-tools'
import { listActivity, recordChanges, undoActivity, UndoConflictError } from './activity'
import { closeAllBooks, openBook, type BookContext } from './workspace'

const SCENE = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
let book: BookContext
let context: ToolContext

beforeEach(async () => {
  const workspaceDir = await createTestWorkspace()
  book = await openBook(workspaceDir, 'sample-book')
  context = { workspaceDir, book, caller: { kind: 'mcp', name: 'Cursor' }, policy: { read: 'allow', propose: 'allow', write: 'allow', destructive: 'ask' } }
})
afterEach(() => closeAllBooks())

const all = () => listActivity(book, { limit: 50 })

/** A write tool that rewrites a scene body, like future editing tools will. */
const rewriteTool = defineWroteTool({
  name: 'rewrite_scene',
  title: 'Rewrite a scene',
  description: 'test',
  permission: 'write',
  input: z.object({ body: z.string() }),
  async handler({ body }, { book }) {
    const entry = await book!.repository.read(SCENE)
    await book!.repository.write(SCENE, { frontmatter: entry.frontmatter, body })
    return { path: SCENE }
  },
})

describe('activity log', () => {
  it('records each write tool call with who, what and the before/after state', async () => {
    const note = await runTool(createNoteTool, { title: 'Agent idea', body: 'Try a storm.' }, context)
    const [entry] = await all()
    expect(entry).toMatchObject({ actor: { kind: 'mcp', name: 'Cursor' }, tool: 'create_note', permission: 'write', undoable: true, output: note })
    expect(entry!.changes).toEqual([{ path: note.path, before: null, after: expect.stringContaining('Try a storm.') }])
  })

  it('logs proposals without file changes as not undoable, and never logs reads', async () => {
    await runTool(proposeEditTool, { entryId: 'scn_arr1val001', find: 'The tide was out', replace: 'The tide had gone out' }, context)
    expect(await all()).toMatchObject([{ tool: 'propose_edit', changes: [], undoable: false }])
  })

  it('undoes a change by restoring the before-state and logs the undo', async () => {
    const original = await book.repository.readRaw(SCENE)
    await runTool(rewriteTool, { body: 'All new.' }, context)
    const [entry] = await all()
    const { entry: undone, undo } = await undoActivity(book, entry!.id)
    expect(await book.repository.readRaw(SCENE)).toBe(original)
    expect(undone.undoneAt).not.toBeNull()
    expect(undo).toMatchObject({ tool: 'undo', undoOf: entry!.id, actor: { kind: 'user' }, changes: [{ path: SCENE, after: original }] })
    await expect(undoActivity(book, entry!.id)).rejects.toThrow('already undone')
  })

  it('removes a created note on undo', async () => {
    const note = await runTool(createNoteTool, { title: 'Temporary' }, context)
    await undoActivity(book, (await all())[0]!.id)
    expect(await book.repository.readRaw(note.path)).toBeNull()
  })

  it('reports files edited since as conflicts and only overwrites them when forced', async () => {
    await runTool(rewriteTool, { body: 'AI version.' }, context)
    const [entry] = await all()
    const current = await book.repository.read(SCENE)
    await book.repository.write(SCENE, { frontmatter: current.frontmatter, body: 'Author edited after.' })
    await expect(undoActivity(book, entry!.id)).rejects.toBeInstanceOf(UndoConflictError)
    expect((await book.repository.read(SCENE)).body).toContain('Author edited after.')
    await undoActivity(book, entry!.id, { force: true })
    expect((await book.repository.read(SCENE)).body).toContain('The tide was out')
  })

  it('filters by actor and tool, newest first', async () => {
    await runTool(createNoteTool, { title: 'One' }, context)
    await runTool(createNoteTool, { title: 'Two' }, { ...context, caller: { kind: 'assistant', name: 'Assistant' } })
    expect((await listActivity(book, { actor: 'assistant', limit: 50 })).map(e => e.actor.name)).toEqual(['Assistant'])
    expect((await listActivity(book, { tool: 'create_note', limit: 50 })).map(e => (e.input as { title: string }).title)).toEqual(['Two', 'One'])
  })

  it('marks calls that move or trash files as not undoable', async () => {
    const recorder = recordChanges(book.repository)
    await recorder.repository.trash(SCENE)
    expect(recorder.undoable()).toBe(false)
  })
})
