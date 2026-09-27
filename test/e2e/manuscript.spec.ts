import { expect, test } from '@playwright/test'
import { gotoHydrated } from './utils'

async function createBook(request: import('@playwright/test').APIRequestContext, title: string) {
  const res = await request.post('/api/books', { data: { title, template: 'novel' } })
  return (await res.json()) as { book: { id: string }, firstScenePath: string }
}

test('shows the manuscript tree and adds a scene via the node menu', async ({ page, request, isMobile }, testInfo) => {
  const { book, firstScenePath } = await createBook(request, `Tree ${testInfo.project.name} ${Date.now()}`)
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
  const tree = page.getByRole('tree', { name: 'Manuscript' })
  await expect(tree.getByText('Opening')).toBeVisible()

  await tree.getByRole('button', { name: 'Actions for Chapter One' }).click()
  await page.getByRole('menuitem', { name: 'New scene' }).click()
  await page.getByLabel('Title').fill('Second scene')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page).toHaveURL(/02-second-scene\.md$/)
  await expect(page.getByRole('navigation', { name: /breadcrumb/i }).getByText('Second scene')).toBeVisible()
})

test('reorders scenes with "Move up" (works on touch)', async ({ page, request, isMobile }, testInfo) => {
  const { book, firstScenePath } = await createBook(request, `Order ${testInfo.project.name} ${Date.now()}`)
  const chapterId = (await (await request.get(`/api/books/${book.id}/structure`)).json())[0].children[0].id
  await request.post(`/api/books/${book.id}/structure`, { data: { type: 'scene', title: 'Later', parentId: chapterId } })
  await gotoHydrated(page, `/books/${book.id}/write/${firstScenePath}`)
  if (isMobile) await page.getByRole('button', { name: 'Toggle sidebar' }).click()
  const tree = page.getByRole('tree', { name: 'Manuscript' })
  await tree.getByRole('button', { name: 'Actions for Later' }).click()
  await page.getByRole('menuitem', { name: 'Move up' }).click()

  await expect.poll(async () => {
    const structure = await (await request.get(`/api/books/${book.id}/structure`)).json()
    return structure[0].children[0].children.map((s: { title: string }) => s.title)
  }).toEqual(['Later', 'Opening'])
})
