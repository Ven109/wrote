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

test('an agent\'s outline proposals appear live as ghost cards; accepting adds the beat', async ({ page, request, baseURL }, testInfo) => {
  const book = await createBook(request, `Proposals ${testInfo.project.name} ${Date.now()}`)
  await request.post(`/api/books/${book.id}/outline/ops`, { data: { ops: [{ op: 'addAct', id: 'act_e2e0000001', title: 'Setup' }, { op: 'addBeat', id: 'bt_e2e0000001', actId: 'act_e2e0000001', title: 'The storm hits', summary: '' }] } })
  await gotoHydrated(page, `/books/${book.id}/outline`)
  const client = await agent(request, baseURL, 'Plotting agent')
  const result = await client.callTool({ name: 'propose_outline_changes', arguments: { bookId: book.id, source: 'Bridge', proposals: [
    { change: { kind: 'addBeat', actId: 'act_e2e0000001', afterBeatId: 'bt_e2e0000001', title: 'Shelter in the lighthouse' }, rationale: 'Gives them a quiet moment.' },
    { change: { kind: 'note', text: 'Why does nobody warn the harbor?' } },
  ] } })
  expect(result.isError).toBeFalsy()
  await client.close()

  const setup = page.getByRole('region', { name: 'Setup' })
  const ghost = setup.getByRole('listitem', { name: 'Proposed beat: Shelter in the lighthouse' })
  await expect(ghost).toContainText('Gives them a quiet moment.')
  await expect(ghost).toContainText('Bridge · Plotting agent')
  const proposals = page.getByRole('region', { name: /Proposals/ })
  await expect(proposals.getByRole('listitem', { name: /Note: Why does nobody warn/ })).toBeVisible()

  await ghost.getByRole('button', { name: 'Accept proposed beat: Shelter in the lighthouse' }).click()
  await expect(setup.getByRole('listitem', { name: 'Shelter in the lighthouse', exact: true })).toContainText('Unwritten')
  await expect(ghost).toHaveCount(0)
  await proposals.getByRole('button', { name: /Reject note/ }).click()
  await expect(proposals).toHaveCount(0)
  const outline = (await (await request.get(`/api/books/${book.id}/document`, { params: { path: 'outline.md' } })).json() as { body: string }).body
  expect(outline).toMatch(/### The storm hits[\s\S]*### Shelter in the lighthouse/)
  expect(outline).not.toContain('warn the harbor')
})
