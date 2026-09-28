import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { Outline } from '#shared/schemas/outline'
import type { OutlineProposal } from '#shared/schemas/outline-proposals'
import { useOutlineProposals } from './useOutlineProposals'

const base = { rationale: 'Pacing.', source: 'Bridge', author: { kind: 'assistant' as const, name: 'Assistant' }, model: null, status: 'pending' as const, createdAt: '2026-01-01T00:00:00.000Z' }
const beat: OutlineProposal = { ...base, id: 'opr_beat000001', change: { kind: 'addBeat', actId: 'act_1', afterBeatId: 'bt_a', title: 'Bridge', summary: '' } }
const note: OutlineProposal = { ...base, id: 'opr_note000001', change: { kind: 'note', text: 'Plot hole.' } }
const resolved: unknown[] = []
registerEndpoint('/api/books/prop-book/outline/proposals', () => [beat, note])
registerEndpoint('/api/books/prop-book/outline/proposals/opr_beat000001', { method: 'POST', handler: async (event) => {
  resolved.push(await readBody(event))
  return {}
} })
registerEndpoint('/api/books/prop-book/outline/proposals/opr_note000001', { method: 'POST', handler: async (event) => {
  resolved.push(await readBody(event))
  return {}
} })

describe('useOutlineProposals', () => {
  it('places ghost cards, lists notes and resolves proposals', async () => {
    const outline = ref<Outline>({ notes: '', acts: [{ id: 'act_1', title: 'One', beats: [{ id: 'bt_a', title: 'A', summary: '', scenes: [] }] }] })
    let proposals!: ReturnType<typeof useOutlineProposals>
    await mountSuspended(defineComponent({
      setup() {
        proposals = useOutlineProposals('prop-book', outline)
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(proposals.pending.value).toHaveLength(2))
    expect(proposals.ghosts('act_1', 'bt_a')).toEqual([beat])
    expect(proposals.loose.value).toEqual([note])
    await proposals.accept(beat)
    await proposals.reject(note)
    expect(resolved).toEqual([{ status: 'accepted', edits: {} }, { status: 'rejected' }])
    expect(proposals.pending.value).toEqual([])
  })
})
