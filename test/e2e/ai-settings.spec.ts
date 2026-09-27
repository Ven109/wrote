import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

// AI settings are workspace-wide, so this flow runs once (desktop) in order.
test.describe.configure({ mode: 'serial' })

let ollama: Server
let ollamaUrl = ''

test.beforeAll(async () => {
  ollama = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    if (request.url === '/api/tags') return void response.end(JSON.stringify({ models: [{ name: 'tiny:latest' }] }))
    if (request.url === '/v1/chat/completions') {
      return void response.end(JSON.stringify({
        id: 'c1', object: 'chat.completion', created: 0, model: 'tiny:latest',
        choices: [{ index: 0, message: { role: 'assistant', content: 'OK' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }))
    }
    response.statusCode = 404
    response.end('{}')
  })
  await new Promise<void>(resolve => ollama.listen(0, '127.0.0.1', resolve))
  ollamaUrl = `http://127.0.0.1:${(ollama.address() as AddressInfo).port}`
})
test.afterAll(() => ollama.close())

test('without AI the assistant shows a setup hint', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Workspace-wide settings flow runs on desktop')
  await gotoHydrated(page, '/')
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  await page.getByRole('link', { name: 'Set up AI' }).click()
  await expect(page).toHaveURL(/\/settings\/ai$/)
  await expect(page.getByText('AI is off')).toBeVisible()
})

test('configures a local Ollama model and tests the connection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Workspace-wide settings flow runs on desktop')
  await gotoHydrated(page, '/settings/ai')
  await page.getByRole('switch', { name: 'Enable Ollama' }).click()
  const baseUrl = page.getByPlaceholder('http://localhost:11434')
  await baseUrl.fill(ollamaUrl)
  await baseUrl.press('Tab')

  await page.getByRole('button', { name: 'Chat', exact: true }).click()
  await page.getByRole('option', { name: 'tiny:latest' }).click()
  await expect(page.getByText('AI is off')).toBeHidden()

  await page.getByRole('button', { name: 'Test connection' }).click()
  await expect(page.getByRole('status').filter({ hasText: /Connected \(\d+ ms\)/ })).toBeVisible()
})

test('API keys are write-only', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'Workspace-wide settings flow runs on desktop')
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

test('settings page fits a phone screen', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Layout check for phones')
  await gotoHydrated(page, '/settings/ai')
  await expect(page.getByRole('heading', { name: 'Providers' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})
