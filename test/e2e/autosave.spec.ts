import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

interface Scene { id: string, title: string, path: string, status?: string }

async function bookWithScenes(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book } = (await res.json()) as { book: { id: string } }
  const chapterId = (await (await request.get(`/api/books/${book.id}/structure`)).json())[0].children[0].id
  await request.post(`/api/books/${book.id}/structure`, { data: { type: 'scene', title: 'Second', parentId: chapterId } })
  const structure = await (await request.get(`/api/books/${book.id}/structure`)).json()
  return { bookId: book.id, scenes: structure[0].children[0].children as Scene[] }
}

const bodyOf = async (request: APIRequestContext, bookId: string, path: string) =>
  ((await (await request.get(`/api/books/${bookId}/document`, { params: { path } })).json()) as { body: string }).body

test('autosaves after typing stops', async ({ page, request }, testInfo) => {
  const { bookId, scenes } = await bookWithScenes(request, `Auto ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenes[0]!.path}`)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Saved by itself.')
  await expect(page.getByRole('status').getByText('Saved')).toBeVisible({ timeout: 5000 })
  await expect.poll(() => bodyOf(request, bookId, scenes[0]!.path)).toContain('Saved by itself.')
})

test('loses no edits when switching scenes quickly', async ({ page, request, isMobile }, testInfo) => {
  test.skip(isMobile, 'Uses the sidebar tree; covered on desktop')
  const { bookId, scenes } = await bookWithScenes(request, `Switch ${Date.now()}-${testInfo.retry}`)
  const [first, second] = scenes as [Scene, Scene]
  await gotoHydrated(page, `/books/${bookId}/write/${first.path}`)
  const tree = page.getByRole('tree', { name: 'Manuscript' })

  for (const round of [1, 2, 3]) {
    await page.locator('.ProseMirror').click()
    await page.keyboard.type(` first-${round}`)
    await tree.getByText(second.title).click()
    await expect(page).toHaveURL(new RegExp(second.path))
    await page.locator('.ProseMirror').click()
    await page.keyboard.type(` second-${round}`)
    await tree.getByText(first.title).click()
    await expect(page).toHaveURL(new RegExp(first.path))
  }

  await expect.poll(() => bodyOf(request, bookId, first.path)).toMatch(/first-1.*first-2.*first-3/s)
  await expect.poll(() => bodyOf(request, bookId, second.path)).toMatch(/second-1.*second-2.*second-3/s)
})

test('flushes pending edits when the tab is closed', async ({ page, request }, testInfo) => {
  const { bookId, scenes } = await bookWithScenes(request, `Close ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenes[0]!.path}`)
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Last words.')
  await page.close({ runBeforeUnload: true })
  await expect.poll(() => bodyOf(request, bookId, scenes[0]!.path)).toContain('Last words.')
})

test('edits scene details and updates the tree badge', async ({ page, request, isMobile }, testInfo) => {
  const { bookId, scenes } = await bookWithScenes(request, `Meta ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenes[0]!.path}`)
  await page.getByRole('button', { name: 'Scene details' }).click()
  const panel = page.getByRole('dialog', { name: 'Scene details' })
  await panel.getByLabel('POV').fill('Mara')
  await panel.getByLabel('Status').click()
  await page.getByRole('option', { name: 'Final' }).click()
  await panel.getByRole('button', { name: 'Save details' }).click()
  await expect(panel).toBeHidden()

  const res = await request.get(`/api/books/${bookId}/document`, { params: { path: scenes[0]!.path } })
  expect((await res.json()).frontmatter).toMatchObject({ pov: 'Mara', status: 'final' })
  if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
  await expect(page.getByRole('tree', { name: 'Manuscript' }).getByLabel(/final/i).first()).toBeVisible()
})

test('shows live word counts', async ({ page, request }, testInfo) => {
  const { bookId, scenes } = await bookWithScenes(request, `Words ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenes[1]!.path}`)
  await expect(page.getByRole('button', { name: 'Word counts' })).toHaveText('0 words')
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('one two three')
  await expect(page.getByRole('button', { name: 'Word counts' })).toHaveText('3 words')
  await page.getByRole('button', { name: 'Word counts' }).click()
  await expect(page.getByText('This session')).toBeVisible()
  await expect(page.getByText('+3')).toBeVisible()
})
