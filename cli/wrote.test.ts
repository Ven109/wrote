import { join } from 'node:path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createTestWorkspace } from '../test/utils/workspace'
// @ts-expect-error – plain ESM build script without types
import { buildCli } from './build.mjs'

let client: Client

beforeAll(async () => {
  // Inside the repo so the bundle's external dependencies resolve from node_modules.
  const outfile = await buildCli(join(process.cwd(), 'node_modules/.cache/wrote-cli', `wrote-${Date.now()}.mjs`))
  const workspace = await createTestWorkspace()
  client = new Client({ name: 'stdio-test', version: '1.0.0' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [outfile, 'mcp', '--book', join(workspace, 'sample-book')], cwd: process.cwd(), stderr: 'ignore' }))
}, 60_000)
afterAll(() => client?.close())

describe('wrote mcp (stdio)', () => {
  it('serves the tools for the given book', async () => {
    const names = (await client.listTools()).tools.map(tool => tool.name)
    expect(names).toContain('search')
    const result = await client.callTool({ name: 'search', arguments: { query: 'harbor' } })
    expect((result.content as { text: string }[])[0]!.text).toContain('Arrival')
  })
})
