import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { runTool, type ToolContext } from '../tools/define'
import { addCommentTool, listCommentsTool } from '../tools/comment-tools'
import { addComment, listComments, replyToComment, resolveComment } from './comments'
import { closeAllBooks, openBook, type BookContext } from './workspace'

const ARRIVAL = 'scn_arr1val001'
const ARRIVAL_PATH = 'manuscript/01-part-one/01-the-harbor/01-arrival.md'
let book: BookContext
let context: ToolContext
beforeEach(async () => {
  const workspaceDir = await createTestWorkspace()
  book = await openBook(workspaceDir, 'sample-book')
  context = { workspaceDir, book, caller: { kind: 'mcp', name: 'Claude Code' } }
})
afterEach(() => closeAllBooks())

describe('comments', () => {
  it('anchors an agent\'s comment to a unique passage without changing the text', async () => {
    const before = await book.repository.readRaw(ARRIVAL_PATH)
    await runTool(addCommentTool, { entryId: ARRIVAL, quote: 'The tide was out', body: 'Strong opening image.' }, context)
    expect(await book.repository.readRaw(ARRIVAL_PATH)).toBe(before)
    expect(await runTool(listCommentsTool, { entryId: ARRIVAL }, context)).toMatchObject([
      { quote: 'The tide was out', body: 'Strong opening image.', author: { kind: 'mcp', name: 'Claude Code' }, detached: false, replies: [] },
    ])
    await expect(runTool(addCommentTool, { entryId: ARRIVAL, quote: 'not in the scene', body: 'x' }, context)).rejects.toMatchObject({ code: 'anchor_not_unique' })
  })

  it('keeps replies, hides resolved comments and marks detached ones', async () => {
    const comment = await addComment(book, { entryId: ARRIVAL, quote: 'The tide was out', body: 'Why now?', author: { kind: 'user', name: 'You' } })
    await replyToComment(book, comment.id, { body: 'Because of the storm.', author: { kind: 'user', name: 'You' } })
    const entry = await book.repository.read(ARRIVAL_PATH)
    await book.repository.write(ARRIVAL_PATH, { frontmatter: entry.frontmatter, body: 'Rewritten completely.' })
    await book.settle()
    expect(await listComments(book, { entryId: ARRIVAL })).toMatchObject([{ detached: true, replies: [{ body: 'Because of the storm.' }] }])
    await resolveComment(book, comment.id, true)
    expect(await listComments(book, { entryId: ARRIVAL })).toEqual([])
    expect(await listComments(book, { entryId: ARRIVAL, includeResolved: true })).toHaveLength(1)
  })
})
