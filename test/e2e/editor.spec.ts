import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { gotoHydrated } from './utils'

async function bookWithScene(request: APIRequestContext, title: string, body: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book, firstScenePath } = (await res.json()) as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body } })
  return { bookId: book.id, path: firstScenePath }
}

async function storedBody(request: APIRequestContext, bookId: string, path: string) {
  const res = await request.get(`/api/books/${bookId}/document`, { params: { path } })
  return ((await res.json()) as { body: string }).body
}

const editorContent = (page: Page) => page.locator('.ProseMirror')

test('edits a scene and saves Markdown with Mod+S (before autosave fires)', async ({ page, request }, testInfo) => {
  const { bookId, path } = await bookWithScene(request, `Edit ${testInfo.project.name} ${Date.now()}`, 'First line with [[Harbor]].\n')
  await gotoHydrated(page, `/books/${bookId}/write/${path}`)
  const content = editorContent(page)
  await expect(content.getByText('First line with')).toBeVisible()
  await expect(content.locator('.wiki-link')).toHaveText('Harbor')

  await content.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line.')
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByRole('status').getByText('Saved')).toBeVisible()
  await expect.poll(() => storedBody(request, bookId, path)).toBe('First line with [[Harbor]].\n\nSecond line.\n')
})

test('block mode: slash menu and block handle menu', async ({ page, request, isMobile }, testInfo) => {
  test.skip(isMobile, 'Block mode is desktop-only')
  const { bookId, path } = await bookWithScene(request, `Blocks ${Date.now()}-${testInfo.retry}`, 'Alpha\n\nBeta\n')
  await gotoHydrated(page, `/books/${bookId}/write/${path}`)
  const content = editorContent(page)

  await content.getByText('Beta').hover()
  await page.getByRole('button', { name: 'Block actions' }).click()
  await page.getByRole('menuitem', { name: 'Move up' }).click()
  await expect(content.locator('p').first()).toHaveText('Beta')

  await content.getByText('Alpha').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: /Heading 2/ }).click()
  await page.keyboard.type('Title')
  await expect(content.locator('h2')).toHaveText('Title')
})

test('document mode: bottom toolbar and block action sheet, no drag handle', async ({ page, request, isMobile }, testInfo) => {
  test.skip(!isMobile, 'Document mode is the touch layout')
  const { bookId, path } = await bookWithScene(request, `Doc ${Date.now()}-${testInfo.retry}`, 'Alpha\n\nBeta\n')
  await gotoHydrated(page, `/books/${bookId}/write/${path}`)
  const content = editorContent(page)
  const toolbar = page.getByTestId('editor-mobile-toolbar')
  await expect(toolbar).toBeVisible()
  await expect(page.getByRole('button', { name: 'Block actions' })).toHaveCount(1)

  await content.getByText('Alpha').tap()
  await toolbar.getByRole('button', { name: 'Block actions' }).tap()
  await page.getByRole('dialog').getByRole('button', { name: 'Move down' }).tap()
  await expect(content.locator('p').first()).toHaveText('Beta')
})
