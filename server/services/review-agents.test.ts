import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { agentsForPrompts } from '../mcp/agent-prompts'
import { createWroteMcpServer } from '../mcp/server'
import { deleteCustomAgent, listReviewAgents, readCustomAgents, reviewAgent, saveCustomAgent } from './review-agents'
import { previewAgent } from './review-runs'
import { closeAllBooks, openBook, type BookContext } from './workspace'

let workspaceDir: string
let book: BookContext
beforeEach(async () => {
  workspaceDir = await createTestWorkspace()
  book = await openBook(workspaceDir, 'sample-book')
})
afterEach(() => closeAllBooks())

const victorian = { id: 'victorian-dialogue', name: 'Victorian dialogue checker', description: 'Modern words in dialogue.', instructions: 'Flag words that did not exist in 1880s London.', scopes: ['scene' as const], task: 'chat' as const, tools: [], summary: false, categories: ['anachronism'] }

describe('custom agents', () => {
  it('are saved to agents/<id>.md and listed after the built-ins without a restart', async () => {
    await saveCustomAgent(book, victorian)
    expect(await book.repository.readRaw('agents/victorian-dialogue.md')).toContain('name: Victorian dialogue checker')
    const ids = (await listReviewAgents(book)).map(agent => agent.id)
    expect(ids.at(-1)).toBe('victorian-dialogue')
    expect(await reviewAgent(book, 'victorian-dialogue')).toMatchObject({ source: 'book', categories: ['anachronism'] })
  })

  it('reports invalid files, replaces a built-in with a customised copy and falls back when it is deleted', async () => {
    await book.repository.writeRaw('agents/broken.md', '---\nname: Broken\n---\n')
    await saveCustomAgent(book, { ...victorian, id: 'editor', name: 'House editor' })
    const { agents, problems } = await readCustomAgents(book)
    expect(agents.map(agent => agent.id)).toEqual(['editor'])
    expect(problems).toMatchObject([{ file: 'agents/broken.md' }])
    expect((await listReviewAgents(book)).filter(agent => agent.id === 'editor')).toMatchObject([{ name: 'House editor', source: 'book' }])
    await deleteCustomAgent(book, 'editor')
    expect(await reviewAgent(book, 'editor')).toMatchObject({ name: 'Editor', source: 'builtin' })
    await expect(deleteCustomAgent(book, 'nobody')).rejects.toThrow(/nobody/)
  })

  it('can be tried on a scene without storing findings', async () => {
    const result = await previewAgent(book, { ...victorian, source: 'book' }, 'scn_arr1val001', {
      model: 'test:model',
      review: async () => ({ findings: [{ quote: 'The tide was out', severity: 'low', category: 'anachronism', message: 'Fine for 1880.', suggestion: null }, { quote: 'invented', severity: 'high', category: 'x', message: 'x', suggestion: null }], summary: null }),
    })
    expect(result).toMatchObject({ scene: 'Arrival', summary: null, findings: [{ quote: 'The tide was out', category: 'anachronism' }] })
    expect(result.findings).toHaveLength(1)
    expect((await book.state.$client.execute('SELECT COUNT(*) AS n FROM comments')).rows[0]!.n).toBe(0)
  })

  it('are offered to MCP clients as prompts', async () => {
    await saveCustomAgent(book, victorian)
    const server = createWroteMcpServer({ workspaceDir, agents: await agentsForPrompts([book]) })
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'test', version: '1.0.0' })
    await client.connect(clientTransport)
    const names = (await client.listPrompts()).prompts.map(prompt => prompt.name)
    expect(names).toEqual(expect.arrayContaining(['review-editor', 'review-continuity', 'review-victorian-dialogue']))
    const prompt = await client.getPrompt({ name: 'review-victorian-dialogue', arguments: { entryId: 'chp_harb0r0001' } })
    const text = JSON.stringify(prompt.messages)
    expect(text).toContain('Flag words that did not exist in 1880s London.')
    expect(text).toContain('wrote://book/sample-book/scene/scn_themap0001')
    expect(text).toContain('add_comment')
    await client.close()
  })
})
