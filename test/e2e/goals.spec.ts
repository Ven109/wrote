import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('sets a word goal, writes, and sees today\'s progress in the editor and on the Goals page', async ({ page, request }, testInfo) => {
  const { book, firstScenePath } = await (await request.post('/api/books', { data: { title: `Goals ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string }, firstScenePath: string }
  const deadline = new Date(Date.now() + 9 * 86_400_000)
  const day = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`
  await gotoHydrated(page, `/books/${book.id}/goals`)
  const form = page.getByRole('form', { name: 'Writing goal' })
  await form.getByLabel('Word target').fill('1000')
  await form.getByLabel('Deadline').fill(day)
  await form.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByText('1,000 to go · 10 days left')).toBeVisible()

  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'Ten words of a new beginning to count for the goal today.\n' } })
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  await expect(page.getByRole('link', { name: /^Today 12 of 100 words$/ })).toBeVisible()
  await page.getByRole('link', { name: /^Today 12 of 100 words$/ }).click()
  await expect(page.getByText('1 day', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: /1 days with writing/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
