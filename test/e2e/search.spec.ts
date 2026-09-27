import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('searches the book from the command palette and opens a hit', async ({ page, request, isMobile }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Search ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = (await res.json()) as { book: { id: string }, firstScenePath: string }
  const note = await (await request.post(`/api/books/${book.id}/notes`, { data: { text: 'Lighthouse keeper\nThe keeper trims the wick every night.' } })).json()
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  if (isMobile) {
    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Search and commands' }).click()
  }
  else {
    await page.keyboard.press('ControlOrMeta+k')
  }
  await page.getByPlaceholder('Search or type a command…').fill('trims the wick')
  const hit = page.getByRole('option', { name: /Lighthouse keeper – Matches the words/ })
  await expect(hit).toBeVisible()
  await expect(hit).toContainText('The keeper trims the wick every night.')
  await hit.click()
  await expect(page).toHaveURL(new RegExp(`/notes/${note.path}$`))
  await expect(page.getByPlaceholder('Search or type a command…')).toBeHidden()
})
