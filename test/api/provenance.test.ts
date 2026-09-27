import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { $fetch, fetch, setup, url } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import { createMcpToken } from '../utils/mcp-token'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setup({ server: true, nuxtConfig: { runtimeConfig: { workspaceDir: workspace } } })

const book = '/api/books/sample-book'
const path = 'manuscript/01-part-one/01-the-harbor/02-the-map.md'

describe('provenance API', () => {
  it('records accepted AI text and reports it per entry and for the book', async () => {
    const token = await createMcpToken($fetch)
    const client = new Client({ name: 'provenance-test', version: '1.0.0' })
    await client.connect(new StreamableHTTPClientTransport(new URL(url('/mcp')), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
    await client.callTool({ name: 'propose_edit', arguments: { entryId: 'scn_themap0001', find: 'tired creases', replace: 'creases her father had worn into it' } })
    await client.close()
    const [suggestion] = await $fetch<{ id: string }[]>(`${book}/suggestions`, { query: { entryId: 'scn_themap0001' } })

    // The editor applies the accepted text (autosave), then records the decision.
    const doc = await $fetch<{ body: string, hash: string }>(`${book}/document`, { query: { path } })
    await $fetch(`${book}/document`, { method: 'PUT', body: { path, body: doc.body.replace('tired creases', 'creases her father had worn into it'), expectedHash: doc.hash } })
    await $fetch(`${book}/suggestions/resolve`, { method: 'POST', body: { ids: [suggestion!.id], status: 'accepted' } })

    const provenance = await $fetch<{ ranges: { text: string, author: { kind: string }, words: number }[], stats: { aiWords: number } }>(`${book}/provenance`, { query: { entryId: 'scn_themap0001' } })
    expect(provenance.ranges).toEqual([expect.objectContaining({ text: 'creases her father had worn into it', author: expect.objectContaining({ kind: 'mcp' }), words: 7 })])
    const stats = await $fetch<{ book: { aiWords: number }, entries: Record<string, { aiWords: number }> }>(`${book}/provenance/stats`)
    expect(stats.book.aiWords).toBe(7)
    expect(stats.entries.chp_harb0r0001!.aiWords).toBe(7)
  })

  it('validates the entry id', async () => {
    expect((await fetch(`${book}/provenance?entryId=../../etc`)).status).toBe(400)
    expect((await fetch(`${book}/provenance?entryId=scn_missing0001`)).status).toBe(404)
  })
})
