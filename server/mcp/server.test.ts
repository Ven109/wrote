import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { closeAllBooks, openBook } from '../services/workspace'
import { createWroteMcpServer, type WroteMcpOptions } from './server'

let workspaceDir: string
let client: Client | undefined

beforeAll(async () => {
  workspaceDir = await createTestWorkspace()
})
afterEach(() => client?.close())
afterAll(() => closeAllBooks())

async function connect(options: Partial<WroteMcpOptions> = {}) {
  const server = createWroteMcpServer({ workspaceDir, ...options })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  client = new Client({ name: 'test', version: '1.0.0' })
  await client.connect(clientTransport)
  return client
}

const text = (result: Awaited<ReturnType<Client['callTool']>>) => (result.content as { text: string }[])[0]!.text

describe('Wrote MCP server', () => {
  it('lists the shared tools with annotations and an optional bookId', async () => {
    const c = await connect()
    const { tools } = await c.listTools()
    const names = tools.map(tool => tool.name)
    expect(names).toEqual(expect.arrayContaining(['list_books', 'search', 'read_entry', 'get_structure', 'get_codex', 'get_progress', 'create_note', 'propose_edit']))
    const search = tools.find(tool => tool.name === 'search')!
    expect(search.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false })
    expect(search.inputSchema.properties).toHaveProperty('bookId')
    expect(tools.find(tool => tool.name === 'list_books')!.inputSchema.properties ?? {}).not.toHaveProperty('bookId')
  })

  it('searches the only book without a bookId and creates notes in the inbox', async () => {
    const c = await connect({ caller: { kind: 'mcp', name: 'Claude Code' } })
    expect(text(await c.callTool({ name: 'search', arguments: { query: 'harbor' } }))).toContain('Arrival')
    const created = await c.callTool({ name: 'create_note', arguments: { title: 'From MCP', body: 'Hello from an agent.' } })
    expect(created.isError).toBeFalsy()
    const book = await openBook(workspaceDir, 'sample-book')
    const { entries } = await book.repository.list()
    expect(entries.some(entry => entry.frontmatter.title === 'From MCP' && entry.path.startsWith('notes/inbox/'))).toBe(true)
  })

  it('reports tool errors as MCP errors instead of throwing', async () => {
    const c = await connect()
    const result = await c.callTool({ name: 'read_entry', arguments: { path: 'manuscript/nope.md' } })
    expect(result.isError).toBe(true)
    expect(text(result)).toMatch(/not found/i)
    const unknownBook = await c.callTool({ name: 'search', arguments: { query: 'x', bookId: 'nope' } })
    expect(unknownBook.isError).toBe(true)
  })

  it('can be restricted to read-only tools', async () => {
    const c = await connect({ permissions: ['read'] })
    const names = (await c.listTools()).tools.map(tool => tool.name)
    expect(names).not.toContain('create_note')
    expect(names).not.toContain('propose_edit')
  })
})
