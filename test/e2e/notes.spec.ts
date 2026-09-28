import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

async function createBook(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  return ((await res.json()) as { book: { id: string } }).book.id
}

test('quick capture from anywhere with the keyboard only', async ({ page, request }, testInfo) => {
  const bookId = await createBook(request, `Capture ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write`)
  await page.keyboard.press('ControlOrMeta+Shift+N')
  const dialog = page.getByRole('dialog', { name: 'Quick capture' })
  await expect(dialog.getByLabel('Note text')).toBeFocused()
  await page.keyboard.type('Lighthouse keeper')
  await page.keyboard.press('Shift+Enter')
  await page.keyboard.type('He drew the first map.')
  // Acceptance: capture-to-saved under 2 seconds (the poll times out after 2s from Enter).
  await page.keyboard.press('Enter')
  await expect.poll(async () => {
    const notes = await (await request.get(`/api/books/${bookId}/notes`, { params: { filter: 'inbox' } })).json()
    return notes.map((n: { title: string }) => n.title)
  }, { timeout: 2000 }).toEqual(['Lighthouse keeper'])
  await expect(dialog).toBeHidden()
})

test('notes list filters, edit, tag, pin and file out of the inbox', async ({ page, request, isMobile }, testInfo) => {
  const bookId = await createBook(request, `Notes ${testInfo.project.name} ${Date.now()}`)
  await request.post(`/api/books/${bookId}/notes`, { data: { text: 'Storm idea\nRain for three days.' } })
  await request.post(`/api/books/${bookId}/notes`, { data: { text: 'Harbor smell' } })
  await gotoHydrated(page, `/books/${bookId}/notes`)
  const list = page.getByRole('navigation', { name: 'Note list' })
  await expect(list.getByRole('link')).toHaveCount(2)

  await page.getByLabel('Search notes').fill('rain')
  await expect(list.getByRole('link')).toHaveCount(1)
  await list.getByRole('link', { name: /Storm idea/ }).click()

  await expect(page.locator('.ProseMirror')).toContainText('Rain for three days.')
  const tags = page.getByLabel('Tags')
  await tags.click()
  await page.keyboard.type('weather')
  await page.keyboard.press('Enter')
  await page.getByRole('button', { name: 'Pin note' }).click()
  await expect(page.getByRole('button', { name: 'Unpin note' })).toBeVisible()
  await page.getByRole('button', { name: 'File note out of the inbox' }).click()
  await expect(page).toHaveURL(/\/notes\/notes\/storm-idea\.md$/)

  const res = await request.get(`/api/books/${bookId}/document`, { params: { path: 'notes/storm-idea.md' } })
  expect((await res.json()).frontmatter).toMatchObject({ pinned: true, tags: ['weather'] })
  if (isMobile) await page.getByRole('link', { name: 'Back to notes' }).click()
  await page.getByLabel('Search notes').fill('')
  await page.getByRole('tab', { name: /Inbox/ }).click()
  await expect(list.getByRole('link')).toHaveCount(1)
  await expect(list.getByRole('link', { name: /Harbor smell/ })).toBeVisible()
})

test('inbox triage suggests a codex link and the chapter, and applies them', async ({ page, request }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Triage ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The lighthouse stairs were steep and wet.\n' } })
  await request.post(`/api/books/${book.id}/codex`, { data: { type: 'character', title: 'Ines Calder' } })
  const { path } = await (await request.post(`/api/books/${book.id}/notes`, { data: { text: 'Lighthouse idea\nInes Calder counts the lighthouse stairs.' } })).json() as { path: string }
  await gotoHydrated(page, `/books/${book.id}/notes/${path}`)

  const suggestions = page.getByRole('region', { name: 'Triage suggestions' })
  await suggestions.getByRole('button', { name: 'Link Ines Calder' }).click()
  await expect(suggestions.getByRole('button', { name: 'Link Ines Calder' })).toBeHidden()
  await suggestions.getByRole('button', { name: /^Link chapter .+ and file the note$/ }).click()
  await expect(page).toHaveURL(/\/notes\/notes\/lighthouse-idea\.md$/)
  const saved = await (await request.get(`/api/books/${book.id}/document`, { params: { path: 'notes/lighthouse-idea.md' } })).json() as { body: string }
  expect(saved.body).toMatch(/\[\[Ines Calder\]\] \[\[.+\]\]/)
})
