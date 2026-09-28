import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

test('builds an outline and moving a beat on the board updates outline.md and the tree view', async ({ page, request, isMobile }, testInfo) => {
  const { book } = await (await request.post('/api/books', { data: { title: `Outline ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string } }
  const outlineFile = async () => ((await (await request.get(`/api/books/${book.id}/document`, { params: { path: 'outline.md' } })).json()) as { body: string }).body
  await gotoHydrated(page, `/books/${book.id}/outline`)
  await expect(page.getByText('No acts yet')).toBeVisible()

  for (const title of ['Setup', 'Confrontation']) {
    await page.getByRole('button', { name: 'Add act' }).click()
    await page.getByLabel('Title').fill(title)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('region', { name: title })).toBeVisible()
  }
  await page.getByRole('button', { name: 'Add beat to Setup' }).click()
  await page.getByLabel('Title').fill('The storm hits')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  const setup = page.getByRole('region', { name: 'Setup' })
  await expect(setup.getByRole('listitem', { name: 'The storm hits' })).toContainText('Unwritten')

  const confrontation = page.getByRole('region', { name: 'Confrontation' })
  if (isMobile) {
    await setup.getByRole('button', { name: 'Actions for The storm hits' }).click()
    await page.getByRole('menuitem', { name: 'Move to next act' }).click()
  }
  else {
    await setup.getByRole('listitem', { name: 'The storm hits' }).dragTo(confrontation.getByRole('list'))
  }
  await expect(confrontation.getByRole('listitem', { name: 'The storm hits' })).toBeVisible()
  await expect.poll(outlineFile).toMatch(/## Confrontation\n\n<!-- wrote:act id=act_\w+ -->\n\n### The storm hits/)

  await page.getByRole('button', { name: 'Tree' }).click()
  const tree = page.getByRole('tree', { name: 'Outline' })
  await expect(tree.getByRole('treeitem').nth(2)).toContainText('The storm hits')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await tree.getByRole('treeitem', { name: /The storm hits/ }).click()
  await page.getByLabel('Summary').fill('Rain for three days.')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect.poll(outlineFile).toContain('Rain for three days.')
})
