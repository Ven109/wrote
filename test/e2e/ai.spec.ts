import { devices, expect, test, type Page } from '@playwright/test'
import { startFakeOpenAi, type FakeOpenAi } from '../utils/fake-openai'
import { join } from 'node:path'
import { gotoHydrated } from './utils'

// AI settings are workspace-wide and both projects share one server, so every AI flow runs here,
// in order, on the desktop project (phones are covered with an emulated context below).
test.describe.configure({ mode: 'serial' })
test.skip(({ isMobile }) => isMobile, 'AI flows run serially on the desktop project')

let model: FakeOpenAi

test.beforeAll(async () => {
  model = await startFakeOpenAi((messages) => {
    const lastUser = [...messages].reverse().find(message => message.role === 'user')
    const system = JSON.stringify(messages[0]?.content ?? '')
    if (system.includes('story bible')) return { text: JSON.stringify({ entries: [
      { name: 'Captain Rook', type: 'character', existingId: null, aliases: ['Rook'], facts: [{ field: 'role', value: 'supporting' }], description: 'Waits at the market.', evidence: ['Captain Rook waited'] },
      { name: 'Weir Market', type: 'place', existingId: null, aliases: [], facts: [], description: 'A market.', evidence: ['at the Weir Market'] },
    ] }) }
    if (system.includes('You review one scene')) {
      return { text: JSON.stringify({ findings: [
        { quote: 'The harbor smelled of salt.', severity: 'medium', category: 'imagery', message: 'Name the smell more precisely.', suggestion: 'The harbor reeked of salt and diesel.' },
        { quote: 'harbor', severity: 'low', category: 'repetition', message: 'Harbor appears often in this chapter.', suggestion: null },
        { quote: 'Not in the scene at all', severity: 'high', category: 'invented', message: 'Dropped.', suggestion: null },
      ] }) }
    }
    if (system.includes('story structure editor')) {
      return JSON.stringify(lastUser?.content).includes('between')
        ? { text: JSON.stringify({ beats: [
            { title: 'Shelter in the lighthouse', summary: 'They wait out the storm.', rationale: 'A quiet beat before the map.' },
            { title: 'The keeper talks', summary: 'He knew her father.', rationale: 'Motivates the search.' },
          ] }) }
        : { text: JSON.stringify({ notes: [{ text: 'Nothing explains why the Guild waits.' }], beats: [{ actId: 'act_e2e0000002', afterBeatId: null, title: 'The Guild watches', summary: 'Spies at the harbor.', rationale: 'Sets up the offer.' }] }) }
    }
    if (system.includes('manuscript editor')) return { text: JSON.stringify(lastUser?.content).includes('Continue after') ? 'The gulls rose over the pier.' : 'The harbor reeked of brine.' }
    if (JSON.stringify(lastUser?.content).includes('When were lighthouses automated')) {
      const tools = messages.filter(message => message.role === 'tool').length
      if (tools === 0) return { toolCall: { name: 'web-search__web_search', arguments: { query: 'lighthouse automation' } } }
      if (tools === 1) return { toolCall: { name: 'create_note', arguments: { title: 'Lighthouse automation', body: 'Lighthouses were automated in the 1980s (web search).' } } }
      return { text: 'They were automated in the 1980s – I saved a note.' }
    }
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

test('the context drawer shows exactly what was sent, and leaving an item out changes the next answer\'s prompt', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Context ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  const prompt = page.getByPlaceholder('Ask about your book…')
  await prompt.fill('Which scenes mention the harbor?')
  await prompt.press('Enter')
  await expect(page.getByText('The harbor appears in')).toBeVisible()
  const sentSystem = () => String(model.requests.at(-1)!.messages[0]!.content)
  expect(sentSystem()).toContain('The harbor smelled of salt.')

  await page.getByRole('button', { name: 'Show the context sent with this answer' }).click()
  const drawer = page.getByRole('dialog', { name: 'Context sent' })
  const working = drawer.getByRole('region', { name: 'What you are working on' })
  await expect(working).toContainText('Scene “Opening” (open)')
  await expect(working).toContainText('The harbor smelled of salt.')
  await drawer.getByRole('button', { name: 'Show the full prompt' }).click()
  await expect(drawer.locator('pre')).toContainText('<book_context>')

  const requestsBefore = model.requests.length
  await drawer.getByRole('button', { name: 'Leave out Scene “Opening” (open)' }).click()
  await drawer.getByRole('button', { name: 'Answer again with these changes' }).click()
  await expect(page.getByRole('button', { name: 'Clear context changes' })).toContainText('0 pinned · 1 left out')
  await expect.poll(() => model.requests.length).toBeGreaterThan(requestsBefore)
  await expect(page.getByText('The harbor appears in')).toBeVisible()
  expect(sentSystem()).not.toContain('The harbor smelled of salt.')
})

test('inline AI actions stream into suggestions: rephrase a selection, continue from the slash menu', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Inline ${Date.now()}`)
  const body = async () => ((await (await page.request.get(`/api/books/${bookId}/document`, { params: { path: scenePath } })).json()) as { body: string }).body
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  const editor = page.locator('.ProseMirror')

  await editor.locator('p').first().click({ clickCount: 3 })
  await page.getByRole('button', { name: 'AI actions' }).click()
  await page.getByRole('menuitem', { name: 'Rephrase' }).click()
  await expect(editor.locator('.ai-suggestion-del')).toHaveText('The harbor smelled of salt.')
  await expect(editor.locator('.ai-suggestion-ins')).toHaveText('The harbor reeked of brine.')
  expect(await body()).toBe('The harbor smelled of salt.\n')
  await editor.getByRole('button', { name: 'Accept suggestion by AI · Rephrase' }).click()
  await expect.poll(body).toBe('The harbor reeked of brine.\n')

  await editor.locator('p').first().click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/contin')
  await page.getByRole('option', { name: 'Continue writing' }).click()
  await expect(editor.locator('.ai-suggestion-block')).toContainText('The gulls rose over the pier.')
  await editor.getByRole('button', { name: 'Accept suggestion by AI · Continue writing' }).click()
  await expect.poll(body).toContain('The gulls rose over the pier.')
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

test('scan chapter proposes codex entries that are only added when accepted', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Scan ${Date.now()}`)
  await page.request.put(`/api/books/${bookId}/document`, { data: { path: scenePath, body: 'Captain Rook waited at the Weir Market.\n' } })
  await gotoHydrated(page, `/books/${bookId}/codex`)
  await page.getByRole('button', { name: 'Scan chapter for codex entries' }).click()
  await page.getByRole('combobox', { name: 'Chapter to scan' }).click()
  await page.getByRole('option').first().click()
  await page.getByRole('button', { name: 'Scan', exact: true }).click()

  const review = page.getByRole('list', { name: 'Codex proposals' })
  await expect(review).toContainText('Captain Rook')
  await expect(review).toContainText('“Captain Rook waited”')
  await review.getByRole('button', { name: 'Edit Captain Rook' }).click()
  await review.getByLabel('Name').fill('Captain Ada Rook')
  await review.getByRole('button', { name: 'Accept Captain Rook' }).click()
  await review.getByRole('button', { name: 'Reject Weir Market' }).click()
  await expect(page.getByText('All reviewed')).toBeVisible()
  await page.keyboard.press('Escape')

  const entries = page.getByRole('navigation', { name: 'Codex entries' })
  await expect(entries).toContainText('Captain Ada Rook')
  await expect(entries).not.toContainText('Weir Market')
})

test('outline helpers propose bridge beats and plot holes as ghost cards', async ({ page }) => {
  const { bookId } = await createBookWithHarbor(page, `Helpers ${Date.now()}`)
  await page.request.post(`/api/books/${bookId}/outline/ops`, { data: { ops: [
    { op: 'addAct', id: 'act_e2e0000001', title: 'Setup' },
    { op: 'addBeat', id: 'bt_e2e0000001', actId: 'act_e2e0000001', title: 'The storm hits', summary: '' },
    { op: 'addBeat', id: 'bt_e2e0000002', actId: 'act_e2e0000001', title: 'She finds the map', summary: '' },
    { op: 'addAct', id: 'act_e2e0000002', title: 'The Guild' },
  ] } })
  await gotoHydrated(page, `/books/${bookId}/outline`)
  const setup = page.getByRole('region', { name: 'Setup' })

  await setup.getByRole('button', { name: 'Actions for The storm hits' }).click()
  await page.getByRole('menuitem', { name: 'Suggest bridge beats' }).click()
  const dialog = page.getByRole('dialog', { name: 'Suggest bridge beats' })
  await expect(dialog.getByRole('combobox', { name: 'To' })).toContainText('She finds the map')
  await dialog.getByRole('button', { name: 'Suggest' }).click()
  await expect(dialog).toBeHidden()
  const ghost = setup.getByRole('listitem', { name: 'Proposed beat: Shelter in the lighthouse' })
  await expect(ghost).toContainText('Bridge: The storm hits → She finds the map')
  await expect(setup.getByRole('listitem', { name: 'Proposed beat: The keeper talks' })).toBeVisible()
  await ghost.getByRole('button', { name: /^Accept/ }).click()
  await setup.getByRole('listitem', { name: 'Proposed beat: The keeper talks' }).getByRole('button', { name: /^Reject/ }).click()
  await expect(setup.getByRole('listitem')).toHaveCount(3)
  await expect(setup.getByRole('listitem').nth(1)).toHaveAccessibleName('Shelter in the lighthouse')

  await page.getByRole('button', { name: 'Ask AI' }).click()
  await page.getByRole('menuitem', { name: 'Find plot holes' }).click()
  await page.getByRole('dialog', { name: 'Find plot holes' }).getByRole('button', { name: 'Suggest' }).click()
  await expect(page.getByRole('region', { name: /Proposals/ }).getByRole('listitem', { name: /Note: Nothing explains why the Guild waits/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'The Guild' }).getByRole('listitem', { name: 'Proposed beat: The Guild watches' })).toContainText('Plot holes')
})

test('a review agent adds findings to the margin; a fix becomes a suggestion, a dismissed finding stays gone', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Review ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Editor', exact: true }).click()
  await page.getByRole('menuitem', { name: 'This scene' }).click()

  const margin = page.getByRole('complementary', { name: 'Comments' })
  const fix = margin.getByRole('article').filter({ hasText: 'medium · imagery' })
  await expect(fix).toContainText('Suggested: The harbor reeked of salt and diesel.')
  await expect(margin.getByRole('article')).toHaveCount(2)
  await fix.getByRole('button', { name: 'Apply fix from Editor' }).click()
  await expect(page.getByRole('button', { name: '1 suggestion' })).toBeVisible()

  await margin.getByRole('article').filter({ hasText: 'low · repetition' }).getByRole('button', { name: 'Dismiss finding from Editor' }).click()
  await expect(margin.getByRole('article')).toHaveCount(1)

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Review history' }).click()
  const history = page.getByRole('dialog', { name: 'Review history' })
  await expect(history).toContainText('Done')
  await expect(history).toContainText('2 findings')
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Editor', exact: true }).click()
  await page.getByRole('menuitem', { name: 'This scene' }).click()
  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Review history' }).click()
  await expect(history.getByRole('listitem').first()).toContainText('0 findings')
  await page.keyboard.press('Escape')
  await expect(margin.getByRole('article')).toHaveCount(1)
})

test('an integration adds web search to the assistant, which saves what it found as a note', async ({ page }) => {
  await gotoHydrated(page, '/settings/integrations')
  await page.getByRole('button', { name: /Local command/ }).click()
  const form = page.getByRole('dialog', { name: 'Add integration' })
  await form.getByLabel('Name', { exact: true }).fill('Web search')
  await form.getByLabel('Command', { exact: true }).fill(process.execPath)
  await form.getByLabel('Arguments', { exact: true }).fill(join(import.meta.dirname, '../utils/fake-mcp-server.mjs'))
  await form.getByRole('radio', { name: /Always allow/ }).check()
  await form.getByRole('button', { name: 'Add and connect' }).click()
  const card = page.getByRole('article', { name: 'Web search' })
  await expect(card).toContainText('Connected')
  await expect(card.getByRole('list', { name: 'Tools of Web search' })).toContainText('Web search')

  const { bookId } = await createBookWithHarbor(page, `Integrations ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/notes`)
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  const prompt = page.getByPlaceholder('Ask about your book…')
  await prompt.fill('When were lighthouses automated? Save it as a note.')
  await prompt.press('Enter')
  await page.getByRole('region', { name: 'Requests waiting for your approval' }).getByRole('button', { name: 'Allow' }).click()
  await expect(page.getByText('They were automated in the 1980s')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Note list' }).getByRole('link', { name: /Lighthouse automation/ })).toBeVisible()
  expect(JSON.stringify(model.requests.at(-1)?.messages)).toContain('Lighthouses were automated in the 1980s')

  await gotoHydrated(page, '/settings/integrations')
  await page.getByRole('button', { name: 'Remove Web search' }).click()
  await expect(page.getByText('No integrations yet')).toBeVisible()
})

test('a custom agent is created and tested on the Agents page, then called with @ in chat and from the Review menu', async ({ page }) => {
  const { bookId, scenePath } = await createBookWithHarbor(page, `Agents ${Date.now()}`)
  await gotoHydrated(page, `/books/${bookId}/agents`)
  await page.getByRole('button', { name: 'New agent' }).click()
  await page.getByLabel('Name', { exact: true }).fill('Victorian dialogue checker')
  await expect(page.getByLabel('Id', { exact: true })).toHaveValue('victorian-dialogue-checker')
  await page.getByLabel('Instructions').fill('Flag words that did not exist in 1880s London.')
  await page.getByRole('button', { name: 'Run test' }).click()
  const test = page.getByRole('region', { name: 'Test on scene' })
  await expect(test).toContainText('2 findings')
  await expect(test).toContainText('medium · imagery')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('navigation', { name: 'Agents' })).toContainText('Victorian dialogue checker')

  await gotoHydrated(page, `/books/${bookId}/write/${scenePath}`)
  await page.getByRole('button', { name: 'Toggle assistant' }).click()
  const prompt = page.getByPlaceholder('Ask about your book…')
  await prompt.fill('@vic')
  await page.getByRole('button', { name: 'Ask Victorian dialogue checker' }).click()
  await expect(prompt).toHaveValue('@victorian-dialogue-checker ')
  await expect(prompt).toBeFocused()
  await expect(page.getByText('Answered by Victorian dialogue checker')).toBeVisible()
  await page.keyboard.type('check this scene')
  await prompt.press('Enter')
  await expect.poll(() => JSON.stringify(model.requests.at(-1)?.messages[0]?.content ?? '')).toContain('review agent \\"Victorian dialogue checker\\"')

  await page.getByRole('button', { name: 'Review', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Victorian dialogue checker' })).toBeVisible()
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

test('routes reviews to their own model and shows usage per feature with a budget', async ({ page, request }) => {
  await gotoHydrated(page, '/settings/ai')
  await page.getByRole('button', { name: 'Per-feature models' }).click()
  await page.getByRole('button', { name: 'Reviews', exact: true }).click()
  await page.getByRole('option', { name: 'tiny:latest' }).click()
  await expect.poll(async () => ((await (await request.get('/api/settings/ai')).json()) as { models: Record<string, string> }).models.review).toBe('ollama:tiny:latest')

  await gotoHydrated(page, '/settings/usage')
  const features = page.getByRole('region', { name: 'By feature' })
  await expect(features.getByText('Assistant')).toBeVisible()
  await expect(page.getByRole('region', { name: 'By model' }).getByText('ollama:tiny:latest')).toBeVisible()
  await page.getByLabel('Budget (USD per month)').fill('25')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/of \$25\.00 spent in/)).toBeVisible()
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('Set a budget to be warned')).toBeVisible()
})
