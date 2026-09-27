import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { listCodexProposals } from '../services/codex-proposals'
import { closeAllBooks, openBook } from '../services/workspace'
import { runTool, type ToolContext } from './define'
import { extractCodexTool, proposeCodexEntriesTool } from './extraction-tools'

let context: ToolContext
beforeAll(async () => {
  const workspaceDir = await createTestWorkspace()
  context = { workspaceDir, book: await openBook(workspaceDir, 'sample-book'), caller: { kind: 'mcp', name: 'Claude Code' } }
})
afterAll(() => closeAllBooks())

describe('codex extraction tools', () => {
  it('stores an agent\'s entries as proposals, dropping ones without real quotes', async () => {
    const entry = (name: string, evidence: string) => ({ name, type: 'place', existingId: null, aliases: [], facts: [], description: '', evidence: [evidence] })
    const result = await runTool(proposeCodexEntriesTool, { entryId: 'scn_meet1ng001', entries: [entry('The Lantern', 'Nobody at the Lantern'), entry('Moon Base', 'on the moon')] }, context)
    expect(result.proposals.map(p => p.title)).toEqual(['The Lantern'])
    expect(await listCodexProposals(context.book!, { sourceEntryId: 'scn_meet1ng001' })).toMatchObject([{ author: { kind: 'mcp', name: 'Claude Code' }, status: 'pending' }])
  })

  it('explains how to proceed when no model is configured', async () => {
    await expect(runTool(extractCodexTool, { entryId: 'scn_meet1ng001' }, context)).rejects.toMatchObject({ code: 'ai_not_configured', message: expect.stringContaining('propose_codex_entries') })
  })
})
