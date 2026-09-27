import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('writes a scene summary by hand and uses it as the synopsis', async ({ page, request }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Summaries ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = (await res.json()) as { book: { id: string }, firstScenePath: string }
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  const summary = page.getByRole('region', { name: 'Summary' })
  await expect(summary).toContainText('turn on background summaries')
  await summary.getByRole('button', { name: 'Write summary' }).click()
  await summary.getByRole('textbox', { name: 'Summary' }).fill('Mara returns to Hollow Bay against her promise.')
  await summary.getByRole('button', { name: 'Save summary' }).click()
  await expect(summary).toContainText('Written by you')

  await page.reload()
  await expect(summary).toContainText('Mara returns to Hollow Bay against her promise.')
  await summary.getByRole('button', { name: 'Use as synopsis' }).click()
  await expect(page.getByText('Saved as synopsis').first()).toBeVisible()
  await page.getByRole('button', { name: 'Scene details' }).click()
  await expect(page.getByRole('dialog').getByLabel('Synopsis')).toHaveValue('Mara returns to Hollow Bay against her promise.')
})
