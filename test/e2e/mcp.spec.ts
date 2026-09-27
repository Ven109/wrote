import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

async function agent(request: APIRequestContext, baseURL: string | undefined, name: string, policy?: Record<string, string>) {
  const { token } = await (await request.post('/api/settings/mcp/clients', { data: { name, policy } })).json() as { token: string }
  const client = new Client({ name: 'e2e-agent', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}

async function createBook(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  return (await res.json() as { book: { id: string } }).book
}

test('an agent allowed to write creates a note that appears in the inbox live', async ({ page, request, baseURL }, testInfo) => {
  const book = await createBook(request, `MCP ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${book.id}/notes`)
  const client = await agent(request, baseURL, 'Trusted agent', { write: 'allow' })
  expect((await client.callTool({ name: 'search', arguments: { query: 'opening', bookId: book.id } })).isError).toBeFalsy()
  const created = await client.callTool({ name: 'create_note', arguments: { bookId: book.id, title: 'Idea from the agent', body: 'Try a storm in chapter two.' } })
  expect(created.isError).toBeFalsy()
  await client.close()
  await expect(page.getByRole('navigation', { name: 'Note list' }).getByRole('link', { name: /Idea from the agent/ })).toBeVisible()
})

test('a write call waits for the author: allow runs it, deny returns an error to the agent', async ({ page, request, baseURL }, testInfo) => {
  const book = await createBook(request, `Approve ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${book.id}/notes`)
  const client = await agent(request, baseURL, 'Cautious agent')
  const requests = page.getByRole('region', { name: 'Requests waiting for your approval' })

  const allowed = client.callTool({ name: 'create_note', arguments: { bookId: book.id, title: 'Allowed note' } })
  await expect(requests).toContainText('Cautious agent wants to create a note')
  await requests.getByRole('button', { name: 'Allow' }).click()
  expect((await allowed).isError).toBeFalsy()
  await expect(page.getByRole('navigation', { name: 'Note list' }).getByRole('link', { name: /Allowed note/ })).toBeVisible()

  const denied = client.callTool({ name: 'create_note', arguments: { bookId: book.id, title: 'Denied note' } })
  await requests.getByRole('button', { name: 'Deny' }).click()
  const result = await denied
  expect(result.isError).toBe(true)
  expect(JSON.stringify(result.content)).toContain('did not approve')
  await expect(requests).toBeHidden()
  await client.close()
})

test('the connect page creates an agent token shown once, with client configs, and revokes it', async ({ page }, testInfo) => {
  const name = `Agent ${testInfo.project.name} ${Date.now()}`
  await gotoHydrated(page, '/settings/mcp')
  await page.getByLabel('Agent name').fill(name)
  await page.getByRole('button', { name: 'Create token' }).click()
  await expect(page.getByLabel('MCP token')).toHaveValue(/^wrote_[0-9a-f]{48}$/)
  await expect(page.getByText('claude mcp add --transport http wrote')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  await page.getByRole('button', { name: 'Done' }).click()
  await expect(page.getByLabel('MCP token')).toBeHidden()

  await expect(page.getByText('never used').last()).toBeVisible()
  await page.getByRole('button', { name: `Revoke ${name}`, exact: true }).click()
  await page.getByRole('button', { name: `Confirm revoking ${name}` }).click()
  await expect(page.getByRole('heading', { name, exact: true })).toBeHidden()
})
