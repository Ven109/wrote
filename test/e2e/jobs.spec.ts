import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

async function createBook(request: import('@playwright/test').APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  return ((await res.json()) as { book: { id: string }, firstScenePath: string })
}

test('shows live job progress and cancels a running job', async ({ page, request }, testInfo) => {
  const { book, firstScenePath } = await createBook(request, `Jobs ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  await request.post(`/api/books/${book.id}/jobs`, { data: { kind: 'sleep', input: { steps: 100, stepMs: 100 } } })

  const indicator = page.getByRole('button', { name: /1 background jobs running/ })
  await expect(indicator).toBeVisible()
  await indicator.click()
  const progress = page.getByRole('list', { name: 'Background jobs' }).getByRole('progressbar')
  await expect(progress).toBeVisible()
  await expect.poll(async () => Number(await progress.getAttribute('aria-valuenow'))).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Cancel Sleep (test)' }).click()
  await expect(page.getByRole('button', { name: 'Background jobs' })).toBeVisible()
  const jobs = await (await request.get(`/api/books/${book.id}/jobs`)).json()
  expect(jobs[0].status).toBe('cancelled')
})

test('rebuilds the search index from the command palette', async ({ page, request, isMobile }, testInfo) => {
  test.skip(isMobile, 'Command palette shortcut is desktop; the indicator is covered on mobile above')
  const { book, firstScenePath } = await createBook(request, `Reindex ${Date.now()}-${testInfo.retry}`)
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  await page.keyboard.press('ControlOrMeta+k')
  await page.getByRole('option', { name: 'Rebuild search index' }).click()
  await expect.poll(async () => {
    const jobs = await (await request.get(`/api/books/${book.id}/jobs`)).json()
    return jobs[0]?.status
  }).toBe('succeeded')
  await page.getByRole('button', { name: 'Background jobs' }).click()
  await expect(page.getByRole('list', { name: 'Background jobs' }).getByText('Rebuild search index')).toBeVisible()
})
