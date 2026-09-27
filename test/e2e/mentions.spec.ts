import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

async function setup(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  const mara = await (await request.post(`/api/books/${book.id}/codex`, { data: { type: 'character', title: 'Mara Velden' } })).json() as { path: string }
  await request.patch(`/api/books/${book.id}/codex/entry`, { data: { path: mara.path, fields: { role: 'protagonist' }, aliases: ['The Cartographer'] } })
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The Cartographer walked to the harbor.\n' } })
  return { bookId: book.id, scenePath: firstScenePath, maraPath: mara.path }
}

test('detects codex names in prose and shows a codex card', async ({ page, request, isMobile }, testInfo) => {
  const { bookId, scenePath } = await setup(request, `Mentions ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  const mention = page.locator('.ProseMirror .codex-mention', { hasText: 'The Cartographer' })
  await expect(mention).toBeVisible()
  if (isMobile) await mention.tap()
  else await mention.hover()
  const card = page.getByRole('dialog', { name: 'Mara Velden' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('protagonist')
  await card.getByRole('link', { name: 'Open entry' }).click()
  await expect(page).toHaveURL(/\/codex\/codex\/characters\/mara-velden\.md$/)
  await expect(page.getByRole('region', { name: /Appears in 1 scene/ })).toBeVisible()
})

test('@ inserts a linked mention of a codex entry', async ({ page, request }, testInfo) => {
  const { bookId, scenePath } = await setup(request, `At ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await page.locator('.ProseMirror').click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(' Then @Car')
  await page.getByRole('option', { name: /Mara Velden/ }).click()
  await expect(page.locator('.ProseMirror .wiki-link', { hasText: 'Mara Velden' })).toBeVisible()
  await expect.poll(async () => {
    const doc = await (await request.get(`/api/books/${bookId}/document`, { params: { path: scenePath } })).json()
    return doc.body as string
  }).toContain('Then [[Mara Velden]]')
})
