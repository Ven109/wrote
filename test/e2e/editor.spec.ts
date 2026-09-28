import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'
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

/**
 * Puts the caret at the end of a paragraph and waits until the editor really has it there – on slow runners a
 * click right after a node-view update can land before the selection settles.
 */
async function caretAtEndOf(page: Page, content: Locator, text: string) {
  await expect(async () => {
    await content.getByText(text, { exact: true }).click()
    await page.keyboard.press('End')
    const atEnd = await page.evaluate((expected) => {
      const selection = window.getSelection()
      return selection?.anchorNode?.textContent === expected && selection.anchorOffset === expected.length
    }, text)
    expect(atEnd).toBe(true)
  }).toPass({ timeout: 10_000 })
}

test('custom blocks: note with a to-do, codex card, scene break – stored as directives; export settings per block', async ({ page, request, isMobile }, testInfo) => {
  test.skip(isMobile, 'Slash menu by keyboard (the insert button covers mobile)')
  const { bookId, path } = await bookWithScene(request, `Custom blocks ${Date.now()}-${testInfo.retry}`, 'Alpha\n')
  await request.post(`/api/books/${bookId}/codex`, { data: { type: 'character', title: 'Mara Velden' } })
  await gotoHydrated(page, `/books/${bookId}/write/${path}`)
  const content = editorContent(page)

  await caretAtEndOf(page, content, 'Alpha')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: /^Note/ }).click()
  await page.keyboard.type('Check the tide tables.')
  const note = content.getByRole('complementary', { name: 'Author note' })
  await expect(note).toContainText('Check the tide tables.')
  await note.getByRole('button', { name: 'Open task – mark done' }).click()
  await expect(note.getByRole('button', { name: 'Done – remove task' })).toBeVisible()

  await caretAtEndOf(page, content, 'Alpha')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: /Codex card/ }).click()
  await content.getByRole('button', { name: 'Codex entry for this card' }).click()
  await page.getByRole('option', { name: /Mara Velden/ }).click()
  await expect(content.getByRole('link', { name: 'Mara Velden' })).toBeVisible()

  await caretAtEndOf(page, content, 'Alpha')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/')
  await page.getByRole('option', { name: /Scene break/ }).click()
  await expect(content.getByRole('separator', { name: 'Scene break' })).toBeVisible()

  await page.keyboard.press('ControlOrMeta+s')
  await expect.poll(() => storedBody(request, bookId, path)).toMatch(/^Alpha\n\n\* \* \*\n\n::codex-card\{id=cdx_\w+\}\n\n:::note\{todo=done\}\nCheck the tide tables\.\n:::\n/)

  await gotoHydrated(page, `/books/${bookId}/settings`)
  await page.getByRole('combobox', { name: 'Notes in exports' }).click()
  await page.getByRole('option', { name: 'Include' }).click()
  await page.getByRole('form', { name: 'Blocks in exports' }).getByRole('button', { name: 'Save' }).click()
  await expect.poll(async () => ((await (await request.get(`/api/books/${bookId}`)).json()) as { blockExport: Record<string, string> }).blockExport).toMatchObject({ 'note': 'include', 'codex-card': 'strip' })
})
