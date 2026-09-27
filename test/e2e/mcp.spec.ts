import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('an agent connected via MCP creates a note that appears in the inbox live', async ({ page, request, baseURL }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `MCP ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book } = await res.json() as { book: { id: string } }
  await gotoHydrated(page, `/books/${book.id}/notes`)
  const list = page.getByRole('navigation', { name: 'Note list' })

  const { token } = await (await request.get('/api/settings/mcp')).json() as { token: string }
  const client = new Client({ name: 'e2e-agent', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  const hits = await client.callTool({ name: 'search', arguments: { query: 'opening', bookId: book.id } })
  expect(hits.isError).toBeFalsy()
  const created = await client.callTool({ name: 'create_note', arguments: { bookId: book.id, title: 'Idea from the agent', body: 'Try a storm in chapter two.' } })
  expect(created.isError).toBeFalsy()
  await client.close()

  await expect(list.getByRole('link', { name: /Idea from the agent/ })).toBeVisible()
})

test('the connect page shows the endpoint and a masked token with client configs', async ({ page }) => {
  await gotoHydrated(page, '/settings/mcp')
  const token = page.getByLabel('MCP token')
  await expect(token).toHaveValue(/^wrote_.{4}•+$/)
  await page.getByRole('button', { name: 'Show token' }).click()
  await expect(token).toHaveValue(/^wrote_[0-9a-f]{48}$/)
  await expect(page.getByText('claude mcp add --transport http wrote')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
