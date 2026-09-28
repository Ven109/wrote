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

test('a scene created from a beat shows the beat while drafting, and follows changes to it', async ({ page, request }, testInfo) => {
  const { book } = await (await request.post('/api/books', { data: { title: `Beats ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string } }
  const ops = (body: unknown) => request.post(`/api/books/${book.id}/outline/ops`, { data: body })
  await ops({ ops: [{ op: 'addAct', id: 'act_e2e0000001', title: 'Setup' }, { op: 'addBeat', id: 'bt_e2e0000001', actId: 'act_e2e0000001', title: 'The storm hits', summary: 'Rain for three days.' }] })
  await gotoHydrated(page, `/books/${book.id}/outline`)

  await page.getByRole('region', { name: 'Setup' }).getByRole('button', { name: 'Edit The storm hits' }).click()
  await page.getByRole('button', { name: 'Create scene' }).click()
  await page.getByRole('link', { name: 'Open “The storm hits”' }).click()
  const panel = page.getByRole('complementary', { name: 'Outline beat' })
  await expect(panel).toContainText('The storm hits')
  await expect(panel).toContainText('Rain for three days.')

  await ops({ ops: [{ op: 'updateBeat', beatId: 'bt_e2e0000001', title: 'The storm breaks' }] })
  await expect(panel).toContainText('The storm breaks')
  await panel.getByRole('link', { name: 'Open the outline' }).click()
  await expect(page.getByRole('region', { name: 'Setup' }).getByRole('listitem', { name: 'The storm breaks' })).toContainText('1 scene')
})

test('applies a beat sheet to an empty outline, then merges another without touching existing beats', async ({ page, request }, testInfo) => {
  const { book } = await (await request.post('/api/books', { data: { title: `Templates ${testInfo.project.name} ${Date.now()}`, template: 'novel' } })).json() as { book: { id: string } }
  await gotoHydrated(page, `/books/${book.id}/outline`)

  await page.getByRole('button', { name: 'Start from a template' }).click()
  const dialog = page.getByRole('dialog', { name: 'Apply a beat sheet' })
  await dialog.getByRole('radio', { name: /Three Acts/ }).check()
  await expect(dialog.getByText('Adds 3 acts and 8 beats.')).toBeVisible()
  await expect(dialog.getByText(/templates\/beat-sheets/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Apply' }).click()
  const setup = page.getByRole('region', { name: 'Act One: Setup' })
  await expect(setup.getByRole('listitem', { name: 'Inciting incident' })).toBeVisible()

  await page.getByRole('button', { name: 'Template', exact: true }).click()
  await dialog.getByRole('radio', { name: /Three Acts/ }).check()
  await expect(dialog.getByText(/^Nothing to add/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Apply' })).toBeDisabled()
  await dialog.getByRole('radio', { name: /Kishōtenketsu/ }).check()
  await dialog.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('region', { name: 'Ten: Twist' })).toBeVisible()
  await expect(setup.getByRole('listitem')).toHaveCount(3)
})
