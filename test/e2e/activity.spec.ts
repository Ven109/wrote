import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('an agent\'s write shows up live in the activity log, with its diff, and is undone in one click', async ({ page, request, baseURL }, testInfo) => {
  const { book } = await (await request.post('/api/books', { data: { title: `Activity ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string } }
  await gotoHydrated(page, `/books/${book.id}/activity`)
  await expect(page.getByText('No activity yet')).toBeVisible()

  const { token } = await (await request.post('/api/settings/mcp/clients', { data: { name: 'Logged agent', policy: { write: 'allow' } } })).json() as { token: string }
  const client = new Client({ name: 'e2e-activity', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  await client.callTool({ name: 'create_note', arguments: { bookId: book.id, title: 'Undo me', body: 'A storm idea.' } })
  await client.close()

  const log = page.getByRole('list', { name: 'Activity log' })
  await expect(log).toContainText('Logged agent · Create a note')
  await log.getByRole('button', { name: 'Show changes' }).click()
  await expect(log).toContainText('A storm idea.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await log.getByRole('button', { name: 'Undo create a note by Logged agent' }).click()
  await expect(log).toContainText('Undone')
  await expect(log).toContainText('Undo: Create a note')
  const inbox = await (await request.get(`/api/books/${book.id}/notes`, { params: { filter: 'inbox' } })).json() as { title: string }[]
  expect(inbox.map(note => note.title)).not.toContain('Undo me')
})
