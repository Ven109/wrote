import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { gotoHydrated } from './utils'

async function bookWithScene(request: APIRequestContext, title: string, body: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book, firstScenePath } = (await res.json()) as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body } })
  return `/books/${book.id}/write/${firstScenePath}`
}

const editor = (page: Page) => page.locator('.ProseMirror')

async function runCommand(page: Page, label: string) {
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByPlaceholder('Search or type a command…')
  await expect(palette).toBeVisible()
  await palette.fill(label)
  await page.getByRole('option', { name: new RegExp(`^${label}`) }).first().click()
  await expect(palette).toBeHidden()
}

/** Distance between the caret line's middle and the middle of the area the text scrolls in. */
function caretOffCentre(page: Page) {
  return page.evaluate(() => {
    const range = window.getSelection()!.getRangeAt(0)
    const caret = (range.getClientRects()[0] ?? (range.startContainer as Element).parentElement!.getBoundingClientRect())
    let scroller: HTMLElement | null = document.querySelector('.ProseMirror')!.parentElement
    while (scroller && !(/(auto|scroll)/.test(getComputedStyle(scroller).overflowY) && scroller.scrollHeight > scroller.clientHeight)) scroller = scroller.parentElement
    const view = scroller ? scroller.getBoundingClientRect() : { top: 0, height: window.innerHeight }
    return Math.abs((caret.top + caret.bottom) / 2 - (view.top + view.height / 2))
  })
}

test('toggles focus, typewriter and distraction-free mode via ⌘K and shortcuts, and remembers them', async ({ page, request }, testInfo) => {
  const url = await bookWithScene(request, `Modes ${testInfo.project.name} ${Date.now()}`, 'First paragraph.\n\nSecond paragraph.\n')
  await gotoHydrated(page, url)
  await editor(page).getByText('Second paragraph.').click()

  await runCommand(page, 'Focus mode')
  await expect(editor(page)).toHaveClass(/focus-mode/)
  await page.keyboard.press('ControlOrMeta+Shift+o')
  await expect(editor(page)).not.toHaveClass(/focus-mode/)

  await page.keyboard.press('ControlOrMeta+Shift+y')
  await expect(editor(page)).toHaveClass(/typewriter-mode/)
  await runCommand(page, 'Typewriter scrolling')
  await expect(editor(page)).not.toHaveClass(/typewriter-mode/)

  await page.keyboard.press('ControlOrMeta+Shift+o')
  await page.reload()
  await expect(editor(page)).toHaveClass(/focus-mode/)
})

test('distraction-free mode shows only the text; Esc and the exit button restore the layout', async ({ page, request }, testInfo) => {
  const url = await bookWithScene(request, `Distraction-free ${testInfo.project.name} ${Date.now()}`, 'Only the text.\n')
  await gotoHydrated(page, url)
  const sidebarToggle = page.getByRole('button', { name: 'Toggle sidebar' })
  await expect(sidebarToggle).toBeVisible()

  await runCommand(page, 'Distraction-free mode')
  await expect(sidebarToggle).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Writing modes' })).toHaveCount(0)
  await expect(page.getByTestId('editor-mobile-toolbar')).toHaveCount(0)
  await expect(editor(page).getByText('Only the text.')).toBeVisible()

  await editor(page).getByText('Only the text.').click()
  await page.keyboard.press('Escape')
  await expect(sidebarToggle).toBeVisible()

  await page.keyboard.press('ControlOrMeta+Shift+f')
  await expect(sidebarToggle).toHaveCount(0)
  await page.getByRole('button', { name: 'Exit distraction-free mode' }).click()
  await expect(sidebarToggle).toBeVisible()
  await expect(page.getByRole('button', { name: 'Writing modes' })).toBeVisible()
})

test('focus mode dims all but the paragraph or sentence at the caret', async ({ page, request }, testInfo) => {
  const url = await bookWithScene(request, `Focus ${testInfo.project.name} ${Date.now()}`, 'Alpha one. Alpha two.\n\nBeta paragraph.\n')
  await gotoHydrated(page, url)
  await page.getByRole('button', { name: 'Writing modes' }).click()
  await page.getByRole('menuitemcheckbox', { name: /Focus mode/ }).click()
  await page.keyboard.press('Escape')

  await editor(page).getByText('Beta paragraph.').click()
  await expect(editor(page).locator('.focus-current')).toHaveText('Beta paragraph.')
  await expect.poll(() => editor(page).locator('p').first().evaluate(el => Number(getComputedStyle(el).opacity))).toBeLessThan(0.5)

  await editor(page).getByText('Alpha one.').click()
  await expect(editor(page).locator('.focus-current')).toHaveText('Alpha one. Alpha two.')
  await runCommand(page, 'Focus on the sentence')
  await editor(page).getByText('Alpha one.').click()
  await expect(editor(page).locator('.focus-dim')).toHaveText(' Alpha two.')
})

test('typewriter scrolling keeps the caret line centred while navigating', async ({ page, request }, testInfo) => {
  const body = Array.from({ length: 40 }, (_, i) => `Paragraph ${i + 1} of a long scene.`).join('\n\n')
  const url = await bookWithScene(request, `Typewriter ${testInfo.project.name} ${Date.now()}`, `${body}\n`)
  await gotoHydrated(page, url)
  await runCommand(page, 'Typewriter scrolling')

  await editor(page).getByText('Paragraph 20 of').click()
  await expect.poll(() => caretOffCentre(page)).toBeLessThan(40)
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect.poll(() => caretOffCentre(page)).toBeLessThan(40)
  await page.keyboard.press('End')
  await page.keyboard.type(' More.')
  await expect.poll(() => caretOffCentre(page)).toBeLessThan(40)
})

test('session timer starts, pauses and hides', async ({ page, request }, testInfo) => {
  const url = await bookWithScene(request, `Timer ${testInfo.project.name} ${Date.now()}`, 'Tick.\n')
  await gotoHydrated(page, url)
  await runCommand(page, 'Session timer')
  const timer = page.getByTestId('session-timer')
  await expect(timer).toContainText('0:00')

  await timer.getByRole('button', { name: /^Start session timer/ }).click()
  await expect(timer).not.toContainText('0:00')
  await timer.getByRole('button', { name: /^Pause session timer/ }).click()
  const paused = await timer.innerText()
  await page.waitForTimeout(1500)
  await expect(timer).toHaveText(paused)

  await timer.getByRole('button', { name: 'Timer options' }).click()
  await page.getByRole('menuitem', { name: 'Hide timer' }).click()
  await expect(timer).toHaveCount(0)
})
