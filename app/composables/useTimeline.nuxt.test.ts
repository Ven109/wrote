import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { TimelineItem, TimelineView } from '#shared/schemas/timeline'
import { useTimeline } from './useTimeline'

const item = (id: string, key: number, patch: Partial<TimelineItem> = {}): TimelineItem => ({
  id, kind: 'scene', title: id, path: `${id}.md`, date: `Day ${key + 1}`, key, endKey: null, group: 'The Harbor', pov: null, location: null, characters: [], places: [], ...patch,
})
const view: TimelineView = {
  items: [
    item('scn_a', 0, { characters: ['mara'], places: ['harbor'] }),
    item('scn_b', 0.5, { characters: ['mara'], places: ['archive'] }),
    item('scn_c', 1, { characters: ['jonah'], places: ['harbor'] }),
  ],
  undated: [],
  people: [{ id: 'jonah', title: 'Jonah' }, { id: 'mara', title: 'Mara' }],
  locations: [{ id: 'archive', title: 'Archive' }, { id: 'harbor', title: 'Harbor' }],
  axis: { key: 0, kind: 'relative', hasTime: false },
  config: { calendars: [] },
}
const moves: unknown[] = []
registerEndpoint('/api/books/tl-book/timeline', () => view)
registerEndpoint('/api/books/tl-book/timeline/scn_c', { method: 'PATCH', handler: async (event) => {
  const body = await readBody<{ key: number }>(event)
  moves.push(body)
  if (body.key < 0) throw createError({ statusCode: 400, statusMessage: 'No date' })
  return { date: 'Day 3', end: null }
} })

async function mount() {
  let timeline!: ReturnType<typeof useTimeline>
  await mountSuspended(defineComponent({
    setup() {
      timeline = useTimeline('tl-book')
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(timeline.items.value).toHaveLength(3))
  return timeline
}

describe('useTimeline', () => {
  it('filters by character and place and switches lanes', async () => {
    const timeline = await mount()
    timeline.character.value = 'mara'
    expect(timeline.items.value.map(i => i.id)).toEqual(['scn_a', 'scn_b'])
    timeline.place.value = 'archive'
    expect(timeline.items.value.map(i => i.id)).toEqual(['scn_b'])
    timeline.character.value = null
    timeline.place.value = null
    timeline.laneMode.value = 'character'
    expect(timeline.lanes.value.map(lane => lane.label)).toEqual(['Jonah', 'Mara'])
  })

  it('flags a character in two places on the same day', async () => {
    const timeline = await mount()
    expect(timeline.overlaps.value).toEqual([{ character: 'mara', day: 0, items: ['scn_a', 'scn_b'], places: ['harbor', 'archive'] }])
    expect([...timeline.flagged.value]).toEqual(['scn_a', 'scn_b'])
    expect(timeline.titleOf('archive')).toBe('Archive')
  })

  it('zooms within the levels', async () => {
    const timeline = await mount()
    const before = timeline.perDay.value
    timeline.zoomIn()
    expect(timeline.perDay.value).toBeGreaterThan(before)
    timeline.zoomOut()
    timeline.zoomOut()
    timeline.zoomOut()
    expect(timeline.canZoomOut.value).toBe(false)
  })

  it('moves an item at once and saves the new key; rolls back when saving fails', async () => {
    const timeline = await mount()
    const c = timeline.items.value[2]!
    timeline.move(c, 2)
    expect(timeline.items.value.find(i => i.id === 'scn_c')!.key).toBe(2)
    await vi.waitFor(() => expect(moves).toEqual([{ key: 2 }]))
    timeline.move(c, -1)
    await vi.waitFor(() => expect(moves).toHaveLength(2))
    await vi.waitFor(() => expect(timeline.items.value.find(i => i.id === 'scn_c')!.key).toBe(1))
  })
})
