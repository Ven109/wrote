import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('creates a book and opens it', async ({ page }, testInfo) => {
  const title = `E2E ${testInfo.project.name} ${Date.now()}`
  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: 'New book' }).first().click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Create book' }).click()
  await expect(page).toHaveURL(/\/books\/e2e-.+\/write\/manuscript\//)
  await expect(page.getByRole('heading', { name: title })).toBeVisible()

  await gotoHydrated(page, '/')
  await expect(page.getByText(title)).toBeVisible()
})
