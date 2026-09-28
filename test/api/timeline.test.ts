import { $fetch, fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { TimelineView } from '#shared/schemas/timeline'
import { setupApiServer } from '../utils/api-server'
import { createTestWorkspace } from '../utils/workspace'

const workspace = await createTestWorkspace()
await setupApiServer(workspace, import.meta.url)

const base = '/api/books/sample-book'
const move = (entryId: string, body: unknown) => fetch(`${base}/timeline/${entryId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

describe('timeline API', () => {
  it('lists scenes in in-world order and filters by character', async () => {
    const view = await $fetch<TimelineView>(`${base}/timeline`)
    expect(view.items.map(item => item.title)).toEqual(['Arrival', 'The Map', 'The Meeting'])
    expect(view.axis).toMatchObject({ kind: 'relative' })
    expect(view.people.map(person => person.title)).toContain('Mara Velden')
    const filtered = await $fetch<TimelineView>(`${base}/timeline`, { query: { from: 'Day 2' } })
    expect(filtered.items.map(item => item.title)).toEqual(['The Meeting'])
  })

  it('moves a scene, keeping the date format, and validates input', async () => {
    const res = await move('scn_arr1val001', { key: 4 })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ date: 'Day 5', end: null })
    const view = await $fetch<TimelineView>(`${base}/timeline`)
    expect(view.items.at(-1)!.title).toBe('Arrival')
    expect((await move('scn_arr1val001', { key: 'soon' })).status).toBe(400)
    expect((await move('cdx_mara000001', { key: 1 })).status).toBe(400)
    expect((await move('scn_missing001', { key: 1 })).status).toBe(404)
  })
})
