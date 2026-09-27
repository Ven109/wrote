import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('an MCP agent proposes edits that appear live as tracked changes, and only land when accepted', async ({ page, request, baseURL }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Suggest ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The keeper trimmed the wick. The lamp burned all night.\n' } })
  const scene = await (await request.get(`/api/books/${book.id}/document`, { params: { path: firstScenePath } })).json() as { id: string }
  const bodyOnDisk = async () => ((await (await request.get(`/api/books/${book.id}/document`, { params: { path: firstScenePath } })).json()) as { body: string }).body
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  const { token } = await (await request.get('/api/settings/mcp')).json() as { token: string }
  const client = new Client({ name: 'e2e-agent', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  await client.callTool({ name: 'propose_edit', arguments: { bookId: book.id, entryId: scene.id, find: 'trimmed the wick', replace: 'trimmed the *last* wick', rationale: 'Raises the stakes' } })
  await client.callTool({ name: 'propose_edit', arguments: { bookId: book.id, entryId: scene.id, find: 'burned all night', replace: 'At dawn the ships came home.', mode: 'insert_after' } })
  await client.close()

  const editor = page.locator('.ProseMirror')
  await expect(editor.locator('.ai-suggestion-del')).toHaveText('trimmed the wick')
  await expect(editor.locator('.ai-suggestion-block')).toContainText('At dawn the ships came home.')
  await expect(page.getByRole('button', { name: '2 suggestions' })).toBeVisible()
  expect(await bodyOnDisk()).toBe('The keeper trimmed the wick. The lamp burned all night.\n')

  // Accept inline: the text changes in the editor and is saved like any edit.
  await editor.getByRole('button', { name: 'Accept suggestion by MCP client' }).first().click()
  await expect(editor).toContainText('The keeper trimmed the last wick.')
  await expect.poll(bodyOnDisk).toContain('trimmed the *last* wick')

  // The block proposal from the panel.
  await page.getByRole('button', { name: '1 suggestion', exact: true }).click()
  const panel = page.getByRole('dialog', { name: 'Suggestions' })
  await expect(panel).toContainText('suggests adding')
  await panel.getByRole('button', { name: 'Accept', exact: true }).click()
  await expect(editor.locator('p', { hasText: 'At dawn the ships came home.' })).toBeVisible()
  await expect.poll(bodyOnDisk).toBe('The keeper trimmed the *last* wick. The lamp burned all night.\n\nAt dawn the ships came home.\n')
  await expect(page.getByRole('button', { name: /^\d+ suggestions?$/ })).toBeHidden()
})
