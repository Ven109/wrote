import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

async function setup(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book, firstScenePath } = (await res.json()) as { book: { id: string }, firstScenePath: string }
  const note = await (await request.post(`/api/books/${book.id}/notes`, { data: { text: 'Harbor lore\nOld stories about the harbor.' } })).json()
  return { bookId: book.id, scenePath: firstScenePath, notePath: note.path as string }
}

const bodyOf = async (request: APIRequestContext, bookId: string, path: string) =>
  ((await (await request.get(`/api/books/${bookId}/document`, { params: { path } })).json()) as { body: string }).body

test('inserts a link with [[, follows it and sees the backlink', async ({ page, request }, testInfo) => {
  const { bookId, scenePath, notePath } = await setup(request, `Links ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  const editor = page.locator('.ProseMirror')
  await editor.click()
  await page.keyboard.type('The keeper told [[Harb')
  await page.getByRole('option', { name: 'Harbor lore' }).click()
  await page.keyboard.type('tales.')
  await expect(editor.locator('.wiki-link')).toHaveText('Harbor lore')
  await expect.poll(() => bodyOf(request, bookId, scenePath)).toContain('[[Harbor lore]]')

  await editor.locator('.wiki-link').click()
  await expect(page).toHaveURL(new RegExp(`/notes/${notePath}$`))
  const backlinks = page.getByRole('region', { name: /Linked from 1 entry/ })
  await expect(backlinks.getByRole('link', { name: /Opening/ })).toBeVisible()
  await expect(backlinks).toContainText('The keeper told [[Harbor lore]]')
})

test('a broken link creates the note on click', async ({ page, request }, testInfo) => {
  const { bookId, scenePath } = await setup(request, `Broken ${testInfo.project.name} ${Date.now()}`)
  await request.put(`/api/books/${bookId}/document`, { data: { path: scenePath, body: 'Ask [[Lighthouse keeper]].\n' } })
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  const chip = page.locator('.ProseMirror .wiki-link')
  await expect(chip).toHaveClass(/wiki-link--broken/)
  await chip.click()
  await expect(page).toHaveURL(/\/notes\/notes\/inbox\/lighthouse-keeper\.md$/)
  await expect(page.getByLabel('Note title')).toHaveValue('Lighthouse keeper')
})

test('renaming an entry updates links, with undo', async ({ page, request }, testInfo) => {
  const { bookId, scenePath, notePath } = await setup(request, `Rename ${testInfo.project.name} ${Date.now()}`)
  await request.put(`/api/books/${bookId}/document`, { data: { path: scenePath, body: 'See [[Harbor lore]].\n' } })
  await gotoHydrated(page, `/books/${bookId}/notes/${notePath}`)
  const title = page.getByLabel('Note title')
  await title.fill('Harbor legends')
  await title.press('Enter')
  await expect(page.getByText('Updated links in 1 entry', { exact: true })).toBeVisible()
  await expect.poll(() => bodyOf(request, bookId, scenePath)).toBe('See [[Harbor legends]].\n')

  await page.getByRole('button', { name: 'Undo rename' }).click()
  await expect.poll(() => bodyOf(request, bookId, scenePath)).toBe('See [[Harbor lore]].\n')
  await expect(title).toHaveValue('Harbor lore')
})
