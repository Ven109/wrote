import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('an agent\'s critique appears live as comments next to the passages, which the author answers and resolves', async ({ page, request, baseURL, isMobile }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Comments ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The keeper trimmed the wick.\n\nThe lamp burned all night.\n' } })
  const scene = await (await request.get(`/api/books/${book.id}/document`, { params: { path: firstScenePath } })).json() as { id: string }
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  const { token } = await (await request.post('/api/settings/mcp/clients', { data: { name: 'Claude Code' } })).json() as { token: string }
  const client = new Client({ name: 'e2e-critic', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  const prompt = await client.getPrompt({ name: 'critique-chapter', arguments: { bookId: book.id, chapterId: await chapterId(request, book.id) } })
  expect(JSON.stringify(prompt.messages)).toContain('add_comment')
  await client.callTool({ name: 'add_comment', arguments: { bookId: book.id, entryId: scene.id, quote: 'burned all night', body: 'Show the cost of keeping it lit.' } })
  await client.close()

  await expect(page.locator('.ProseMirror .comment-highlight', { hasText: 'burned all night' })).toBeVisible()
  // Desktop: a card in the margin next to the passage. Phone: the list opens from the toolbar.
  if (isMobile) await page.getByRole('button', { name: '1 comment' }).click()
  const card = (isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Comments' })).getByRole('article', { name: 'Comment by Claude Code' })
  await expect(card).toContainText('Show the cost of keeping it lit.')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await card.getByLabel('Reply to Claude Code').fill('Good point.')
  await card.getByLabel('Reply to Claude Code').press('Enter')
  await expect(card).toContainText('You: Good point.')
  await card.getByRole('button', { name: 'Resolve comment by Claude Code' }).click()
  await expect(page.locator('.ProseMirror .comment-highlight')).toHaveCount(0)
})

async function chapterId(request: import('@playwright/test').APIRequestContext, bookId: string) {
  const structure = await (await request.get(`/api/books/${bookId}/structure`)).json() as { children: { id: string }[] }[]
  return structure[0]!.children[0]!.id
}
