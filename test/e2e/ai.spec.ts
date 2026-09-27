import { devices, expect, test, type Page } from '@playwright/test'
import { startFakeOpenAi, type FakeOpenAi } from '../utils/fake-openai'
import { gotoHydrated } from './utils'

// AI settings are workspace-wide and both projects share one server, so every AI flow runs here,
// in order, on the desktop project (phones are covered with an emulated context below).
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'AI flows run serially on the desktop project')

let model: FakeOpenAi

test.beforeAll(async () => {
  model = await startFakeOpenAi((messages) => {
    const lastUser = [...messages].reverse().find(message => message.role === 'user')
    if (JSON.stringify(lastUser?.content).includes('inject')) return { text: 'Look: <img src=x onerror="window.__xss=1"> **done**' }
    return messages.some(message => message.role === 'tool')
      ? { text: 'The harbor appears in **Opening**.' }
      : { toolCall: { name: 'search', arguments: { query: 'harbor' } } }
  })
})
test.afterAll(() => model.close())

async function createBookWithHarbor(page: Page, title: string) {
  const res = await page.request.post('/api/books', { data: { title, template: 'novel' } })
  const { book, firstScenePath } = await res.json() as { book: { id: string }, firstScenePath: string }
  await page.request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The harbor smelled of salt.\n' } })
  return { bookId: book.id, scenePath: firstScenePath }
}

test('without AI the assistant shows a setup hint', async ({ page }) => {
  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  await page.getByRole('link', { name: 'Set up AI' }).click()
  await expect(page).toHaveURL(/\/settings\/ai$/)
  await expect(page.getByText('AI is off')).toBeVisible()
})

test('configures a local Ollama model and tests the connection', async ({ page }) => {
  await gotoHydrated(page, '/settings/ai')
  await page.getByRole('switch', { name: 'Enable Ollama' }).click()
  const baseUrl = page.getByPlaceholder('http://localhost:11434')
  await baseUrl.fill(model.url)
  await baseUrl.press('Tab')
  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  await page.getByRole('option', { name: 'tiny:latest' }).click()
  await expect(page.getByText('AI is off')).toBeHidden()
  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Connected \(\d+ ms\)/ })).toBeVisible()
})

test('API keys are write-only', async ({ page, request }) => {
  await gotoHydrated(page, '/settings/ai')
  await page.getByRole('switch', { name: 'Enable Anthropic' }).click()
  await page.getByLabel('Anthropic API key', { exact: true }).fill('sk-ant-e2e-secret')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('API key saved')).toBeVisible()
  await expect(page.getByLabel('Anthropic API key', { exact: true })).toHaveValue('')
  expect(await (await request.get('/api/settings/ai')).text()).not.toContain('e2e-secret')
  await page.reload()
  expect(await page.content()).not.toContain('e2e-secret')
})

test('assistant answers with the search tool, knows the open scene and keeps the thread', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Assistant ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  const panel = page.getByRole('complementary').filter({ has: page.getByPlaceholder('Ask about your book…') })
  await expect(panel.getByLabel('Context')).toContainText('Opening')

  await panel.getByPlaceholder('Ask about your book…').fill('Which scenes mention the harbor?')
  await panel.getByPlaceholder('Ask about your book…').press('Enter')
  await expect(panel.getByText('The harbor appears in')).toBeVisible()
  await expect(panel.locator('strong', { hasText: 'Opening' })).toBeVisible()
  await expect(panel.getByText('Searched “harbor”')).toBeVisible()

  // The open scene was sent as context.
  expect(String(model.requests.at(-1)!.messages[0]!.content)).toContain('scene "Opening" open')

  await page.reload()
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  await expect(page.getByText('The harbor appears in')).toBeVisible()
})

test('the (closed) assistant does not steal keyboard focus from the page', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Focus ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).not.toBe('TEXTAREA')
  await page.keyboard.press('ControlOrMeta+k')
  await expect(page.getByRole('option', { name: 'Rebuild search index' })).toBeVisible()
})

test('model output cannot inject scripts', async ({ page }) => {
  const { bookId } = await createBookWithHarbor(page, `Inject ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write`)
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  const prompt = page.getByPlaceholder('Ask about your book…')
  await prompt.fill('inject please')
  await prompt.press('Enter')
  await expect(page.locator('.prose-chat strong', { hasText: 'done' })).toBeVisible()
  expect(await page.evaluate(() => (window as { __xss?: number }).__xss)).toBeUndefined()
  expect(await page.locator('.prose-chat img[onerror]').count()).toBe(0)
})

test('settings and assistant fit a phone screen', async ({ browser }) => {
  const context = await browser.newContext({ ...devices['Pixel 7'], baseURL: test.info().project.use.baseURL })
  const phone = await context.newPage()
  await gotoHydrated(phone, '/settings/ai')
  await expect(phone.getByRole('heading', { name: 'Providers' })).toBeVisible()
  expect(await phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
  const { bookId } = await createBookWithHarbor(phone, `Phone ${Date.now()}`)
  await gotoHydrated(phone, `/books/${bookId}/write`)
  await phone.getByRole('button', { name: 'Toggle assistant' }).click()
  await expect(phone.getByPlaceholder('Ask about your book…').filter({ visible: true })).toBeVisible()
  await context.close()
})
