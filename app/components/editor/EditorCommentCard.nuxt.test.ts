import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { CommentView } from '#shared/schemas/comments'
import EditorCommentCard from './EditorCommentCard.vue'

const comment: CommentView = {
  id: 'cmt_1', entryId: 'scn_1', quote: 'The tide was out', before: '', after: '', body: 'Strong image.', author: { kind: 'mcp', name: 'Claude Code' },
  replies: [{ id: 'rpl_1', author: { kind: 'user', name: 'You' }, body: 'Thanks', createdAt: '2026-09-28T10:00:00.000Z' }], createdAt: '2026-09-28T10:00:00.000Z', resolvedAt: null, detached: true,
}

describe('EditorCommentCard', () => {
  it('shows the comment with its passage and replies, and emits reply and resolve', async () => {
    const card = await mountSuspended(EditorCommentCard, { props: { comment, active: false, busy: false } })
    expect(card.text()).toContain('Claude Code')
    expect(card.text()).toContain('The tide was out')
    expect(card.text()).toContain('Passage changed')
    expect(card.text()).toContain('You: Thanks')
    const input = card.get('input[aria-label="Reply to Claude Code"]')
    await input.setValue('Agreed')
    await input.trigger('keydown', { key: 'Enter' })
    await card.get('button[aria-label="Resolve comment by Claude Code"]').trigger('click')
    expect(card.emitted('reply')).toEqual([['Agreed']])
    expect(card.emitted('resolve')).toHaveLength(1)
  })
})
