import { expect, test, type APIRequestContext } from '@playwright/test'
import { gotoHydrated } from './utils'

interface Scene { id: string, title: string, path: string }

async function bookWithTimeline(request: APIRequestContext, title: string) {
  const { book } = await (await request.post('/api/books', { data: { title, template: 'novel' } })).json() as { book: { id: string } }
  const structure = async () => (await (await request.get(`/api/books/${book.id}/structure`)).json())[0].children[0]
  const chapterId = (await structure()).id as string
  for (const scene of ['At the Archive', 'Later']) await request.post(`/api/books/${book.id}/structure`, { data: { type: 'scene', title: scene, parentId: chapterId } })
  await request.post(`/api/books/${book.id}/codex`, { data: { type: 'character', title: 'Mara' } })
  for (const place of ['Harbor', 'Archive']) await request.post(`/api/books/${book.id}/codex`, { data: { type: 'place', title: place } })
  const [first, archive, later] = (await structure()).children as Scene[]
  const write = async (scene: Scene, timeline: string | null, body: string) => {
    if (timeline) await request.patch(`/api/books/${book.id}/document`, { data: { path: scene.path, meta: { timeline } } })
    await request.put(`/api/books/${book.id}/document`, { data: { path: scene.path, body } })
  }
  await write(first!, 'Day 1', 'Mara waited at the Harbor.\n')
  await write(archive!, 'Day 1', 'Mara read in the Archive.\n')
  await write(later!, null, 'Nobody knows when.\n')
  return { bookId: book.id, archive: archive! }
}

test('shows scenes in story order, flags a character in two places and moves a scene to another day', async ({ page, request, isMobile }, testInfo) => {
  const { bookId, archive } = await bookWithTimeline(request, `Timeline ${testInfo.project.name} ${Date.now()}`)
  const timelineOf = async () => ((await (await request.get(`/api/books/${bookId}/document`, { params: { path: archive.path } })).json()) as { frontmatter: { timeline?: string } }).frontmatter.timeline
  await gotoHydrated(page, `/books/${bookId}/timeline`)

  const canvas = page.getByRole('region', { name: 'Timeline' })
  await expect(canvas.getByRole('button', { name: /^At the Archive, Day 1/ })).toBeVisible()
  await expect(page.getByText('Mara is in two places on Day 1')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Later' })).toBeVisible()

  const item = canvas.getByRole('button', { name: /^At the Archive/ })
  await item.focus()
  await page.keyboard.press('ArrowRight')
  await expect.poll(timelineOf).toBe('Day 2')
  await expect(page.getByText('Mara is in two places')).toHaveCount(0)

  if (!isMobile) {
    const box = (await item.boundingBox())!
    await page.mouse.move(box.x + 10, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + 10 + 70, box.y + box.height / 2, { steps: 5 })
    await page.mouse.up()
    await expect.poll(timelineOf).toBe('Day 4')
  }

  await page.getByRole('combobox', { name: 'Filter by place' }).click()
  await page.getByRole('option', { name: 'Harbor' }).click()
  await expect(canvas.getByRole('button', { name: /^At the Archive/ })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
})
