import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test.describe('app shell', () => {
  test('shows the library page', async ({ page }) => {
    await gotoHydrated(page, '/')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
  })

  test('opens the command palette from the sidebar search', async ({ page, isMobile }) => {
    test.skip(isMobile, 'search lives in the slideover on mobile')
    await gotoHydrated(page, '/')
    await page.getByRole('button', { name: 'Search and commands' }).click()
    await expect(page.getByPlaceholder('Search or type a command…')).toBeVisible()
    await expect(page.getByText('Toggle assistant')).toBeVisible()
  })

  test('collapses the desktop sidebar to icons', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only')
    await gotoHydrated(page, '/')
    const sidebar = page.locator('[data-slot="root"][data-side="left"]')
    await expect(sidebar).toHaveAttribute('data-state', 'expanded')
    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  })

  test('opens the sidebar as a slideover on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only')
    await gotoHydrated(page, '/')
    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Library', exact: true })).toBeVisible()
  })

  test('opens app settings from the sidebar footer menu', async ({ page, isMobile }) => {
    await gotoHydrated(page, '/')
    if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(page.getByRole('link', { name: 'AI models' })).toHaveCount(0)
    await page.getByRole('button', { name: 'App settings' }).click()
    const menu = page.getByRole('menu')
    await expect(menu.getByText('AI Agents')).toBeVisible()
    await expect(menu.getByRole('menuitem')).toHaveText(['AI models', 'Connect agents', 'Integrations', 'Usage'])
    await menu.getByRole('menuitem', { name: 'Connect agents' }).click()
    await expect(page).toHaveURL(/\/settings\/mcp$/)
  })

  test('has no horizontal scroll', async ({ page }) => {
    await gotoHydrated(page, '/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test('book pages hydrate without mismatches', async ({ page, request }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Hydrate ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  const warnings: string[] = []
  page.on('console', (message) => {
    if (/hydration/i.test(message.text())) warnings.push(message.text())
  })
  for (const path of [`/books/${book.id}/write/${firstScenePath}`, `/books/${book.id}/notes`, `/books/${book.id}/codex`]) {
    await gotoHydrated(page, path)
  }
  expect(warnings).toEqual([])
})
