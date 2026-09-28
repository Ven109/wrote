import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('exports the book as Markdown from the top bar, or chosen chapters only', async ({ page, request }, testInfo) => {
  const title = `Export ${testInfo.project.name} ${Date.now()}`
  const { book, firstScenePath } = await (await request.post('/api/books', { data: { title, template: 'novel' } })).json() as { book: { id: string }, firstScenePath: string }
  await request.put(`/api/books/${book.id}/document`, { data: { path: firstScenePath, body: 'The lamp burned all night.\n\n:::note\nWorking note.\n:::\n' } })
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)

  await page.getByRole('button', { name: 'Export book' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export book' })
  await dialog.getByText('Markdown', { exact: true }).click()
  const downloadPromise = page.waitForEvent('download')
  await dialog.getByRole('button', { name: 'Export', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^export-.*\.md$/)
  const text = await readFile((await download.path())!, 'utf8')
  expect(text).toContain(`title: "${title}"`)
  expect(text).toContain('The lamp burned all night.')
  expect(text).not.toContain('Working note.')
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Export book' }).click()
  await dialog.getByText('Selected chapters').click()
  await expect(dialog.getByRole('button', { name: 'Export', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').first().check()
  await expect(dialog.getByRole('button', { name: 'Export', exact: true })).toBeEnabled()
})

test('picks a preset (switching to its format) and saves it as a new preset of the book', async ({ page, request }, testInfo) => {
  const { book } = await (await request.post('/api/books', { data: { title: `Presets ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string } }
  await gotoHydrated(page, `/books/${book.id}/write`)
  await page.getByRole('button', { name: 'Export book' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export book' })
  await dialog.getByRole('combobox', { name: 'Preset' }).click()
  await page.getByRole('option', { name: /Standard manuscript/ }).click()
  await expect(dialog.getByRole('radio', { name: /Word \(DOCX\)/ })).toBeChecked()

  await dialog.getByRole('button', { name: 'Actions for presets' }).click()
  await page.getByRole('menuitem', { name: 'Save as new preset…' }).click()
  await page.getByLabel('Name').fill('Agent submission')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByRole('combobox', { name: 'Preset' })).toContainText('Agent submission')
  await expect.poll(async () => (await (await request.get(`/api/books/${book.id}/export/presets`)).json() as { presets: { id: string, manuscript: boolean }[] }).presets.find(p => p.id === 'agent-submission')?.manuscript).toBe(true)
})
