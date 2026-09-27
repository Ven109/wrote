import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import { useCodexProposals } from './useCodexProposals'

const proposal = (id: string, title: string): CodexProposal => ({
  id, title, action: 'create', codexType: 'character', targetEntryId: null, targetPath: null, aliases: [], fields: { role: 'minor' }, description: 'D',
  evidence: ['quote'], sourceEntryId: 'chp_1', sourceTitle: 'Harbor', author: { kind: 'assistant', name: 'Scan chapter' }, model: null, status: 'pending', createdAt: '2026-09-27T10:00:00.000Z',
})
const decisions: { id: string }[] = []
registerEndpoint('/api/books/cxp-book/codex/proposals', () => [proposal('cxp_1', 'Tobin'), proposal('cxp_2', 'Ghost')].filter(p => !decisions.some(d => d.id === p.id)))
registerEndpoint('/api/books/cxp-book/codex', () => [])
for (const id of ['cxp_1', 'cxp_2']) {
  registerEndpoint(`/api/books/cxp-book/codex/proposals/${id}`, { method: 'POST', handler: async event => decisions.push({ ...await readBody<object>(event), id }) })
}

describe('useCodexProposals', () => {
  it('accepts with only the author\'s edits, rejects, and drops resolved proposals from the list', async () => {
    let review!: ReturnType<typeof useCodexProposals>
    await mountSuspended(defineComponent({
      setup() {
        review = useCodexProposals('cxp-book')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(review.proposals.value).toHaveLength(2))
    const [tobin, ghost] = review.proposals.value
    review.edit(tobin!)
    review.draft.value!.title = 'Tobin Hale'
    await review.accept(tobin!)
    await review.reject(ghost!)
    expect(decisions).toEqual([
      { status: 'accepted', edits: { title: 'Tobin Hale' }, id: 'cxp_1' },
      { status: 'rejected', id: 'cxp_2' },
    ])
    expect(review.proposals.value).toEqual([])
    expect(review.editing.value).toBeNull()
  })
})
