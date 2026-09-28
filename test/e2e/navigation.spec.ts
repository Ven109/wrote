import { expect, test, type Page } from '@playwright/test'
import { gotoHydrated } from './utils'

/** Collects hydration warnings and errors of a page (production Vue only logs errors thrown in hooks). */
function watchProblems(page: Page) {
  const problems: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error' || message.text().includes('Hydration')) problems.push(message.text())
  })
  page.on('pageerror', error => problems.push(error.message))
  return problems
}

async function openSidebarItem(page: Page, isMobile: boolean, name: string) {
  if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
  // Sidebar items may carry a count badge ("Notes 1").
  await page.getByRole('link', { name: new RegExp(`^${name}( \\d+)?$`) }).first().click()
}

test('leaves pages with an editor through the sidebar', async ({ page, request, isMobile }, testInfo) => {
  const res = await request.post('/api/books', { data: { title: `Nav ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  const { path } = await (await request.post(`/api/books/${book.id}/notes`, { data: { text: 'Harbor idea\nThe gulls.' } })).json() as { path: string }
  const problems = watchProblems(page)

  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  await expect(page.locator('.ProseMirror')).toBeVisible()
  await openSidebarItem(page, isMobile, 'Notes')
  await expect(page).toHaveURL(new RegExp(`/books/${book.id}/notes`))

  await gotoHydrated(page, `/books/${book.id}/notes/${path}`)
  await expect(page.locator('.ProseMirror')).toContainText('The gulls.')
  await openSidebarItem(page, isMobile, 'Codex')
  await expect(page).toHaveURL(new RegExp(`/books/${book.id}/codex`))
  await openSidebarItem(page, isMobile, 'Write')
  await expect(page).toHaveURL(new RegExp(`/books/${book.id}/write`))
  expect(problems).toEqual([])
})

test.describe('in a German locale and time zone', () => {
  test.use({ locale: 'de-DE', timezoneId: 'Europe/Berlin' })

  test('renders dates and numbers without hydration mismatches', async ({ page, request }, testInfo) => {
    await request.post('/api/books', { data: { title: `Locale ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })
    const problems = watchProblems(page)
    await gotoHydrated(page, '/')
    const today = new Date().toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin' })
    await expect(page.getByText(today).first()).toBeVisible()
    expect(problems).toEqual([])
  })
})
