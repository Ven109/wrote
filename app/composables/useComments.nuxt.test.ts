import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import type { CommentView } from '#shared/schemas/comments'
import type { EntryDocument } from '#shared/schemas/document'
import { useComments } from './useComments'

const comment: CommentView = {
  id: 'cmt_1', entryId: 'scn_cmt', quote: 'The tide was out', before: '', after: '', body: 'Strong image.', author: { kind: 'mcp', name: 'Claude Code' },
  replies: [], createdAt: '2026-09-28T10:00:00.000Z', resolvedAt: null, detached: false,
}
const posts: unknown[] = []
registerEndpoint('/api/books/cmt-book/comments', () => [comment])
registerEndpoint('/api/books/cmt-book/comments/cmt_1/replies', { method: 'POST', handler: async event => posts.push(['reply', await readBody(event)]) })
registerEndpoint('/api/books/cmt-book/comments/cmt_1/resolve', { method: 'POST', handler: async event => posts.push(['resolve', await readBody(event)]) })

describe('useComments', () => {
  it('loads the entry\'s comments, sends replies and resolutions, and opens the list on focus without a margin', async () => {
    let comments!: ReturnType<typeof useComments>
    await mountSuspended(defineComponent({
      setup() {
        comments = useComments('cmt-book', ref({ id: 'scn_cmt', path: 'x.md' } as EntryDocument))
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(comments.comments.value).toHaveLength(1))
    await comments.reply('cmt_1', 'Thanks!')
    await comments.resolve('cmt_1')
    expect(posts).toEqual([['reply', { body: 'Thanks!' }], ['resolve', { resolved: true }]])
    comments.focus('cmt_1')
    expect(comments.active.value).toBe('cmt_1')
    expect(comments.panelOpen.value).toBe(!comments.margin.value)
  })
})
