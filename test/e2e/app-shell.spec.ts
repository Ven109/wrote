import { expect, test } from '@playwright/test'

test.describe('app shell', () => {
  test('shows the library page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible()
  })

  test('opens the command palette from the sidebar search', async ({ page, isMobile }) => {
    test.skip(isMobile, 'search lives in the slideover on mobile')
    await page.goto('/')
    await page.getByRole('button', { name: 'Search and commands' }).click()
    await expect(page.getByPlaceholder('Search or type a command…')).toBeVisible()
    await expect(page.getByText('Toggle assistant')).toBeVisible()
  })

  test('collapses the desktop sidebar to icons', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop only')
    await page.goto('/')
    const sidebar = page.locator('[data-slot="root"][data-side="left"]')
    await expect(sidebar).toHaveAttribute('data-state', 'expanded')
    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(sidebar).toHaveAttribute('data-state', 'collapsed')
  })

  test('opens the sidebar as a slideover on mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile only')
    await page.goto('/')
    await page.getByRole('button', { name: 'Toggle sidebar' }).click()
    await expect(page.getByRole('dialog').getByRole('link', { name: 'Library', exact: true })).toBeVisible()
  })

  test('has no horizontal scroll', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
