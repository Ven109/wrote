import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { closeAllBooks, openBook } from '../services/workspace'
import { toAiSdkTools, toMcpTools } from './adapters'
import { runTool, ToolError, type ToolContext } from './define'
import { WROTE_TOOLS } from './index'
import { getCodexEntryTool, getCodexTool } from './codex-tools'
import { getProgressTool, getStructureTool, listBooksTool, readEntryTool, searchTool } from './read-tools'
import { getOutlineTool, updateOutlineTool } from './outline-tools'
import { createNoteTool, listSuggestionsTool, proposeEditTool } from './write-tools'

let context: ToolContext

beforeAll(async () => {
  const workspaceDir = await createTestWorkspace()
  const book = await openBook(workspaceDir, 'sample-book')
  context = { workspaceDir, book, caller: { kind: 'assistant', name: 'Test' } }
})
afterAll(() => closeAllBooks())

describe('tool registry', () => {
  it('has unique names and a permission level for every tool', () => {
    const names = WROTE_TOOLS.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
    for (const t of WROTE_TOOLS) expect(['read', 'propose', 'write', 'destructive']).toContain(t.permission)
  })
})

describe('read tools', () => {
  it('lists books', async () => {
    expect(await runTool(listBooksTool, {}, context)).toEqual([
      { id: 'sample-book', title: 'The Cartographer of Hollow Bay', author: 'Sample Author' },
    ])
  })

  it('searches', async () => {
    const hits = await runTool(searchTool, { query: 'harbor', types: ['scene'] }, context)
    expect(hits.map(h => h.id)).toEqual(['scn_arr1val001'])
  })

  it('reads entries by id or path with pagination', async () => {
    const full = await runTool(readEntryTool, { id: 'scn_arr1val001' }, context)
    expect(full).toMatchObject({ path: 'manuscript/01-part-one/01-the-harbor/01-arrival.md', nextOffset: null })
    const page = await runTool(readEntryTool, { path: full.path, maxChars: 500, offset: 0 }, context)
    expect(page.body).toBe(full.body.slice(0, 500))
  })

  it('returns the manuscript structure with word counts', async () => {
    const [part] = await runTool(getStructureTool, {}, context)
    expect(part).toMatchObject({ title: 'Part One', type: 'part' })
    expect(part!.children.map(c => c.title)).toEqual(['The Harbor', 'The Drowned Guild'])
    expect(part!.children[0]!.children.map(s => s.status)).toEqual(['draft', 'idea'])
    expect(part!.wordCount).toBe(part!.children.reduce((sum, c) => sum + c.wordCount, 0))
  })

  it('filters the codex by type', async () => {
    const places = await runTool(getCodexTool, { codexType: 'place' }, context)
    expect(places.map(e => e.title)).toEqual(['Hollow Bay'])
    const all = await runTool(getCodexTool, {}, context)
    expect(all.find(e => e.title === 'Mara Velden')?.fields).toMatchObject({ eyes: 'grey', role: 'protagonist' })
    expect((await runTool(getCodexTool, { name: 'the cartographer' }, context)).map(e => e.title)).toEqual(['Mara Velden'])
  })

  it('gets one codex entry by id or alias with its type template', async () => {
    const mara = await runTool(getCodexEntryTool, { name: 'The Cartographer' }, context)
    expect(mara).toMatchObject({ id: 'cdx_mara000001', codexType: 'character', fields: { eyes: 'grey' } })
    expect(mara.template?.fields.map(f => f.key)).toContain('relationships')
    expect(mara.body).toContain('afraid of deep water')
    expect((await runTool(getCodexEntryTool, { id: 'cdx_h0llowbay1' }, context)).title).toBe('Hollow Bay')
    await expect(runTool(getCodexEntryTool, { name: 'Nobody' }, context)).rejects.toThrow(/No codex entry/)
    await expect(runTool(getCodexEntryTool, {}, context)).rejects.toThrow()
  })

  it('reports progress', async () => {
    const progress = await runTool(getProgressTool, {}, context)
    expect(progress).toMatchObject({ scenes: 3, notes: 2, inbox: 1, codexEntries: 2 })
    expect(progress.totalWords).toBeGreaterThan(20)
  })

  it('rejects invalid input with a ToolError', async () => {
    await expect(runTool(readEntryTool, {}, context)).rejects.toThrow(ToolError)
  })

  it('requires a book for book tools', async () => {
    await expect(runTool(searchTool, { query: 'x' }, { ...context, book: null })).rejects.toThrow(/needs an open book/)
  })
})

describe('write tools', () => {
  it('creates notes in the inbox when the caller may write', async () => {
    const note = await runTool(createNoteTool, { title: 'Lighthouse keeper', body: 'He drew the map.' }, { ...context, policy: { read: 'allow', propose: 'allow', write: 'allow', destructive: 'ask' } })
    expect(note.path).toBe('notes/inbox/lighthouse-keeper.md')
  })

  it('stores proposed edits as pending suggestions without changing the entry', async () => {
    const before = await runTool(readEntryTool, { id: 'scn_themap0001' }, context)
    const result = await runTool(proposeEditTool, { entryId: 'scn_themap0001', find: 'tired creases', replace: 'soft, tired creases', rationale: 'texture' }, context)
    expect(result.status).toBe('pending')
    const after = await runTool(readEntryTool, { id: 'scn_themap0001' }, context)
    expect(after.body).toBe(before.body)
    const suggestions = await runTool(listSuggestionsTool, { entryId: 'scn_themap0001' }, context)
    expect(suggestions).toEqual([expect.objectContaining({ find: 'tired creases', author: { kind: 'assistant', name: 'Test' } })])
  })

  it('rejects anchors that are missing or ambiguous', async () => {
    await expect(runTool(proposeEditTool, { entryId: 'scn_themap0001', find: 'nonexistent', replace: 'x' }, context)).rejects.toThrow(/does not occur/)
  })
})

describe('adapters', () => {
  it('exposes tools to the AI SDK and runs them', async () => {
    const tools = toAiSdkTools(WROTE_TOOLS, context)
    expect(Object.keys(tools)).toContain('search')
    const hits = await tools.search!.execute!({ query: 'lighthouse', limit: 5 }, { toolCallId: '1', messages: [] } as never)
    expect(hits).toHaveLength(2)
  })

  it('omits book tools when no book is open', () => {
    expect(Object.keys(toAiSdkTools(WROTE_TOOLS, { ...context, book: null }))).toEqual(['list_books'])
  })

  it('describes tools for MCP with JSON schema and annotations', () => {
    const mcp = toMcpTools(WROTE_TOOLS)
    const search = mcp.find(t => t.name === 'search')!
    expect(search.annotations.readOnlyHint).toBe(true)
    expect(search.jsonSchema).toMatchObject({ type: 'object', required: ['query'] })
    expect(mcp.find(t => t.name === 'create_note')!.annotations.readOnlyHint).toBe(false)
  })
})

describe('permissions', () => {
  const policy = (write: 'allow' | 'ask' | 'deny') => ({ read: 'allow' as const, propose: 'allow' as const, write, destructive: 'ask' as const })
  const inboxTitles = async () => (await context.book!.repository.list()).entries.filter(e => e.path.startsWith('notes/inbox/')).map(e => e.frontmatter.title)

  it('refuses denied calls with a clear error and never runs them', async () => {
    await expect(runTool(createNoteTool, { title: 'Denied note' }, { ...context, policy: policy('deny') })).rejects.toMatchObject({ code: 'permission_denied', message: expect.stringMatching(/not allowed/) })
    expect(await inboxTitles()).not.toContain('Denied note')
  })

  it('asks the author for "ask" levels and runs only on approval', async () => {
    const asked: string[] = []
    const approve = (answer: boolean) => async (tool: { name: string }) => {
      asked.push(tool.name)
      return answer
    }
    await expect(runTool(createNoteTool, { title: 'Declined note' }, { ...context, policy: policy('ask'), requestApproval: approve(false) })).rejects.toMatchObject({ code: 'permission_denied' })
    await runTool(createNoteTool, { title: 'Approved note' }, { ...context, policy: policy('ask'), requestApproval: approve(true) })
    expect(asked).toEqual(['create_note', 'create_note'])
    expect(await inboxTitles()).toEqual(expect.arrayContaining(['Approved note']))
    expect(await inboxTitles()).not.toContain('Declined note')
  })

  it('refuses "ask" levels when approval is impossible, and never asks for reads', async () => {
    await expect(runTool(createNoteTool, { title: 'x' }, context)).rejects.toMatchObject({ code: 'approval_unavailable' })
    const requestApproval = async () => {
      throw new Error('should not ask')
    }
    await expect(runTool(searchTool, { query: 'harbor' }, { ...context, requestApproval })).resolves.toBeDefined()
  })
})

describe('outline tools', () => {
  it('reads the outline and restructures it at the write level', async () => {
    const outline = await runTool(getOutlineTool, {}, context)
    expect(outline.acts.map(act => act.id)).toEqual(['act_0ne0000001', 'act_tw00000001'])
    const policy = { read: 'allow' as const, propose: 'allow' as const, write: 'allow' as const, destructive: 'ask' as const }
    const next = await runTool(updateOutlineTool, { ops: [{ op: 'renameAct', actId: 'act_tw00000001', title: 'Act Two: Offers' }] }, { ...context, policy })
    expect(next.acts[1]!.title).toBe('Act Two: Offers')
    await expect(runTool(updateOutlineTool, { ops: [{ op: 'deleteAct', actId: 'act_missing' }] }, { ...context, policy })).rejects.toMatchObject({ code: 'invalid_input' })
  })
})
