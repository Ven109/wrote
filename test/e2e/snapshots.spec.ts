import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('takes a snapshot of a scene, compares it after edits, restores one paragraph and undoes the restore', async ({ page, request }, testInfo) => {
  const { book, firstScenePath } = await (await request.post('/api/books', { data: { title: `Snapshots ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string }, firstScenePath: string }
  const setBody = (body: string) => request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body } })
  const body = async () => ((await (await request.get(`/api/books/${book.id}/document`, { params: { path: firstScenePath } })).json()) as { body: string }).body
  await setBody('The lamp burned.\n\nThe sea was calm.\n')
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  await page.getByRole('link', { name: 'Snapshots of this scene' }).click()
  await page.getByRole('button', { name: 'Take snapshot' }).click()
  const modal = page.getByRole('dialog', { name: 'Take snapshot' })
  await modal.getByLabel('Name').fill('Calm sea')
  await modal.getByRole('button', { name: 'Take snapshot' }).click()
  await expect(page.getByRole('heading', { name: 'Calm sea' })).toBeVisible()
  await expect(page.getByText('Same as now – nothing to restore.')).toBeVisible()

  await setBody('The lamp burned.\n\nThe sea raged.\n')
  await page.reload()
  await page.getByRole('list', { name: 'Snapshots' }).getByRole('button', { name: /Calm sea/ }).click()
  const changed = page.getByRole('listitem', { name: 'Changed', exact: true })
  await expect(changed).toContainText('The sea was calm.')
  await expect(changed).toContainText('The sea raged.')
  await page.getByRole('tab', { name: 'Inline' }).click()
  await changed.getByRole('button', { name: 'Restore this block from the snapshot' }).click()
  await expect.poll(body).toBe('The lamp burned.\n\nThe sea was calm.\n')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect.poll(body).toBe('The lamp burned.\n\nThe sea raged.\n')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
