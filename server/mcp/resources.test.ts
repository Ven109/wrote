import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../../test/utils/workspace'
import { closeAllBooks } from '../services/workspace'
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
const read = async (c: Client, uri: string) => ((await c.readResource({ uri })).contents[0] as { text: string }).text
const promptText = (result: Awaited<ReturnType<Client['getPrompt']>>) => JSON.stringify(result.messages)

describe('MCP resources', () => {
  it('lists scenes, codex entries, the style guide and the outline of the book', async () => {
    const c = await connect()
    const uris = (await c.listResources()).resources.map(resource => resource.uri)
    expect(uris).toEqual(expect.arrayContaining([
      'wrote://book/sample-book/outline',
      'wrote://book/sample-book/style-guide',
      'wrote://book/sample-book/scene/scn_arr1val001',
      'wrote://book/sample-book/codex/character/cdx_mara000001',
    ]))
    expect(uris.indexOf('wrote://book/sample-book/scene/scn_arr1val001')).toBeLessThan(uris.indexOf('wrote://book/sample-book/scene/scn_meet1ng001'))
    expect((await c.listResourceTemplates()).resourceTemplates.map(t => t.uriTemplate)).toContain('wrote://book/{bookId}/codex/{codexType}/{entryId}')
  })

  it('reads each resource type as Markdown', async () => {
    const c = await connect()
    expect(await read(c, 'wrote://book/sample-book/scene/scn_arr1val001')).toMatch(/^# Arrival[\s\S]*The tide was out/)
    const mara = await read(c, 'wrote://book/sample-book/codex/character/cdx_mara000001')
    expect(mara).toContain('# Mara Velden (character)')
    expect(mara).toContain('- aliases: The Cartographer')
    expect(mara).toContain('- role: protagonist')
    expect(await read(c, 'wrote://book/sample-book/outline')).toMatch(/## Structure[\s\S]*\*\*Part One\*\*[\s\S]*\*\*The Harbor\*\*/)
    expect(await read(c, 'wrote://book/sample-book/style-guide')).toBeTruthy()
    await expect(c.readResource({ uri: 'wrote://book/sample-book/codex/place/cdx_mara000001' })).rejects.toThrow()
  })

  it('offers no resources or prompts when reading is denied', async () => {
    const c = await connect({ policy: { read: 'deny', propose: 'allow', write: 'ask', destructive: 'ask' } })
    expect(c.getServerCapabilities()?.resources).toBeUndefined()
    expect(c.getServerCapabilities()?.prompts).toBeUndefined()
  })
})

describe('MCP prompts', () => {
  it('offers the five writing prompts', async () => {
    const c = await connect()
    expect((await c.listPrompts()).prompts.map(p => p.name).sort()).toEqual(['brainstorm-titles', 'character-interview', 'continue-scene', 'critique-chapter', 'summarize-book'])
  })

  it('embeds the book content each prompt needs and points to the reviewable tools', async () => {
    const c = await connect()
    const critique = await c.getPrompt({ name: 'critique-chapter', arguments: { chapterId: 'chp_harb0r0001', focus: 'pacing' } })
    expect(critique.messages.filter(m => m.content.type === 'resource').map(m => (m.content as { resource: { uri: string } }).resource.uri))
      .toEqual(['wrote://book/sample-book/style-guide', 'wrote://book/sample-book/scene/scn_arr1val001', 'wrote://book/sample-book/scene/scn_themap0001'])
    expect(promptText(critique)).toContain('add_comment')
    expect(promptText(await c.getPrompt({ name: 'continue-scene', arguments: { sceneId: 'scn_arr1val001' } }))).toContain('insert_after')
    expect(promptText(await c.getPrompt({ name: 'character-interview', arguments: { character: 'the cartographer' } }))).toContain('Play Mara Velden')
    expect(promptText(await c.getPrompt({ name: 'brainstorm-titles', arguments: { count: '5' } }))).toContain('Brainstorm 5 title ideas')
    expect(promptText(await c.getPrompt({ name: 'summarize-book', arguments: {} }))).toContain('wrote://book/sample-book/outline')
    await expect(c.getPrompt({ name: 'character-interview', arguments: { character: 'Nobody' } })).rejects.toThrow('No codex entry named')
  })
})
