import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

async function createBook(request: APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  const { book } = await res.json() as { book: { id: string } }
  await request.post(`/api/books/${book.id}/codex`, { data: { type: 'place', title: 'Hollow Bay' } })
  return book.id
}

test('creates a character, edits fields, aliases, relationships and description', async ({ page, request, isMobile }, testInfo) => {
  const bookId = await createBook(request, `Codex ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/codex`)
  await page.getByRole('button', { name: 'New', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Character' }).click()
  await page.getByLabel('Name').fill('Mara Velden')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/\/codex\/codex\/characters\/mara-velden\.md$/)

  const details = page.getByRole('region', { name: 'Character details' })
  await details.getByLabel('Aliases').fill('The Cartographer')
  await details.getByLabel('Aliases').press('Enter')
  await details.getByLabel('Age').fill('31')
  await details.getByLabel('Goals').fill('Find her father\'s map')
  await details.getByRole('button', { name: /Relationships/ }).click()
  await page.getByRole('option', { name: 'Hollow Bay' }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('listbox')).toBeHidden()
  await page.locator('.ProseMirror').click()
  await page.keyboard.type('Grew up at the harbor.')

  const path = 'codex/characters/mara-velden.md'
  await expect.poll(async () => {
    const doc = await (await request.get(`/api/books/${bookId}/document`, { params: { path } })).json()
    return { fm: doc.frontmatter, body: doc.body }
  }, { timeout: 10_000 }).toMatchObject({
    fm: { codexType: 'character', age: '31', goals: 'Find her father\'s map', aliases: ['The Cartographer'], relationships: [expect.stringMatching(/^cdx_/)] },
    body: 'Grew up at the harbor.\n',
  })

  if (isMobile) await page.getByRole('link', { name: 'Back to codex' }).click()
  const list = page.getByRole('navigation', { name: 'Codex entries' })
  await page.getByLabel('Search codex').fill('cartog')
  await expect(list.getByRole('link')).toHaveCount(1)
  await expect(list.getByRole('link', { name: /Mara Velden/ })).toBeVisible()
})

test('filters by type and switches to grid view', async ({ page, request }, testInfo) => {
  const bookId = await createBook(request, `Filter ${testInfo.project.name} ${Date.now()}`)
  await request.post(`/api/books/${bookId}/codex`, { data: { type: 'character', title: 'Oren' } })
  await gotoHydrated(page, `/books/${bookId}/codex`)
  const list = page.getByRole('navigation', { name: 'Codex entries' })
  await expect(list.getByRole('link')).toHaveCount(2)
  await page.getByLabel('Filter by type').click()
  await page.getByRole('option', { name: 'Places' }).click()
  await expect(list.getByRole('link')).toHaveCount(1)
  await page.getByRole('button', { name: 'Show as grid' }).click()
  await expect(list).toHaveClass(/grid/)
})
