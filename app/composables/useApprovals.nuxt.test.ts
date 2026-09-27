import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { PendingApproval } from '#shared/schemas/permissions'
import { useApprovals } from './useApprovals'

const approval = (id: string, permission: PendingApproval['permission']): PendingApproval =>
  ({ id, bookId: 'demo', caller: { kind: 'mcp', name: 'Cursor' }, tool: 'create_note', toolTitle: 'Create a note', permission, input: {}, createdAt: '', expiresAt: '' })
const decisions: unknown[] = []
registerEndpoint('/api/books/demo/approvals', () => [approval('apr_1', 'write'), approval('apr_2', 'destructive')])
registerEndpoint('/api/books/demo/approvals/apr_1', { method: 'POST', handler: async event => decisions.push(await readBody(event)) })

describe('useApprovals', () => {
  it('shows write requests as cards and destructive ones as a blocking dialog, and sends the answer', async () => {
    let approvals!: ReturnType<typeof useApprovals>
    await mountSuspended(defineComponent({
      setup() {
        approvals = useApprovals('demo')
        return () => h('div')
      },
    }))
    await vi.waitFor(() => expect(approvals.cards.value.map(a => a.id)).toEqual(['apr_1']))
    expect(approvals.blocking.value?.id).toBe('apr_2')
    await approvals.approve(approvals.cards.value[0]!)
    expect(decisions).toEqual([{ approve: true }])
    expect(approvals.cards.value).toEqual([])
  })
})
