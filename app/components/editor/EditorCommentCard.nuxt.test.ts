import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { CommentView } from '#shared/schemas/comments'
import EditorCommentCard from './EditorCommentCard.vue'

const comment: CommentView = {
  id: 'cmt_1', entryId: 'scn_1', quote: 'The tide was out', before: '', after: '', body: 'Strong image.', author: { kind: 'mcp', name: 'Claude Code' },
  replies: [{ id: 'rpl_1', author: { kind: 'user', name: 'You' }, body: 'Thanks', createdAt: '2026-09-28T10:00:00.000Z' }], createdAt: '2026-09-28T10:00:00.000Z', resolvedAt: null, review: null, detached: true,
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

  it('shows a finding\'s severity, category and fix, and emits fix and dismiss', async () => {
    const finding: CommentView = { ...comment, detached: false, replies: [], author: { kind: 'agent', name: 'Editor' }, review: { runId: 'rvr_1', agentId: 'editor', severity: 'high', category: 'clarity', suggestion: 'The tide had gone out', fingerprint: 'f', suggestionId: null, dismissed: false } }
    const card = await mountSuspended(EditorCommentCard, { props: { comment: finding, active: false, busy: false } })
    expect(card.text()).toContain('high · clarity')
    expect(card.text()).toContain('Suggested: The tide had gone out')
    await card.get('button[aria-label="Apply fix from Editor"]').trigger('click')
    await card.get('button[aria-label="Dismiss finding from Editor"]').trigger('click')
    expect(card.emitted('fix')).toHaveLength(1)
    expect(card.emitted('dismiss')).toHaveLength(1)
    await card.setProps({ comment: { ...finding, review: { ...finding.review!, suggestionId: 'sug_1' } } })
    expect(card.find('button[aria-label="Apply fix from Editor"]').exists()).toBe(false)
  })
})
