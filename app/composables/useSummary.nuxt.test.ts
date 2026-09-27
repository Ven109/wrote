import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { getQuery, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { EntryDocument } from '#shared/schemas/document'
import type { Summary } from '#shared/schemas/summaries'
import { useSummary } from './useSummary'

let stored: Summary | null = { entryId: 'scn_1', scope: 'scene', text: 'Mara arrives.', isManual: false, model: 'ollama:m', updatedAt: '2026-09-27' }
const metaPatches: unknown[] = []
registerEndpoint('/api/books/demo/summaries', {
  method: 'GET',
  handler: event => ({ summary: getQuery(event).entryId === stored?.entryId ? stored : null }),
})
registerEndpoint('/api/books/demo/summaries', {
  method: 'PUT',
  async handler(event) {
    const body = await readBody<{ entryId: string, text: string }>(event)
    stored = { ...stored!, text: body.text, isManual: true, model: null }
    return stored
  },
})
registerEndpoint('/api/books/demo/summaries', {
  method: 'DELETE',
  handler: () => {
    stored = null
    return null
  },
})
registerEndpoint('/api/books/demo/document', {
  method: 'PATCH',
  async handler(event) {
    const body = await readBody<{ meta: unknown }>(event)
    metaPatches.push(body.meta)
    return { ...scene, updatedLinks: [] }
  },
})
registerEndpoint('/api/settings/ai', () => ({ providers: [], models: {}, configured: false, embeddings: false, summaries: { enabled: true, dailyTokenBudget: 1000 } }))

const scene: EntryDocument = { id: 'scn_1', path: 'manuscript/a.md', type: 'scene', title: 'Arrival', body: 'x', hash: 'h', frontmatter: {} }

async function mountSummary(document = scene) {
  let api!: ReturnType<typeof useSummary>
  await mountSuspended(defineComponent({
    setup() {
      api = useSummary('demo', ref(document))
      return () => h('div')
    },
  }))
  return api
}

describe('useSummary', () => {
  it('loads the summary and knows whether background summaries are on', async () => {
    const api = await mountSummary()
    await vi.waitFor(() => expect(api.summary.value?.text).toBe('Mara arrives.'))
    expect(api.visible.value).toBe(true)
    await vi.waitFor(() => expect(api.enabled.value).toBe(true))
  })

  it('edits the summary into a manual one, then resets it', async () => {
    const api = await mountSummary()
    await vi.waitFor(() => expect(api.summary.value).toBeTruthy())
    api.edit()
    expect(api.draft.value).toBe('Mara arrives.')
    api.draft.value = '  Mara comes home, reluctantly.  '
    await api.save()
    expect(api.editing.value).toBe(false)
    expect(api.summary.value).toMatchObject({ text: 'Mara comes home, reluctantly.', isManual: true })
    await api.reset()
    expect(api.summary.value).toBeNull()
  })

  it('copies the summary into the synopsis on request', async () => {
    stored = { entryId: 'scn_2', scope: 'scene', text: 'Mara arrives.', isManual: false, model: 'ollama:m', updatedAt: '2026-09-27' }
    const api = await mountSummary({ ...scene, id: 'scn_2' })
    await vi.waitFor(() => expect(api.summary.value).toBeTruthy())
    expect(await api.useAsSynopsis()).toBe(true)
    expect(metaPatches).toEqual([{ synopsis: 'Mara arrives.' }])
  })

  it('is hidden for entries without summaries', async () => {
    const api = await mountSummary({ ...scene, id: 'nte_1', type: 'note' })
    expect(api.visible.value).toBe(false)
  })
})
