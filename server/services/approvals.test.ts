import { afterEach, describe, expect, it } from 'vitest'
import type { ApprovalEvent } from '#shared/schemas/permissions'
import { subscribeApprovalEvents } from '../utils/book-events'
import { decideApproval, listApprovals, requestApproval } from './approvals'

const request = { bookId: 'book-a', caller: { kind: 'mcp', name: 'Cursor' }, tool: 'create_note', toolTitle: 'Create a note', permission: 'write' as const, input: { title: 'x' } }
const events: ApprovalEvent[] = []
const unsubscribe = subscribeApprovalEvents('book-a', event => events.push(event))
afterEach(() => {
  events.length = 0
})

describe('approvals', () => {
  it('waits for the author, announces the request and resolves with the answer', async () => {
    const answer = requestApproval(request)
    const [pending] = listApprovals('book-a')
    expect(pending).toMatchObject({ tool: 'create_note', caller: { name: 'Cursor' } })
    expect(listApprovals('book-b')).toEqual([])
    expect(decideApproval(pending!.id, true)).toBe(true)
    expect(await answer).toBe(true)
    expect(events.map(e => e.state)).toEqual(['pending', 'approved'])
    expect(decideApproval(pending!.id, false)).toBe(false)
  })

  it('denies when the author says no or does not answer in time', async () => {
    const denied = requestApproval(request)
    decideApproval(listApprovals('book-a')[0]!.id, false)
    expect(await denied).toBe(false)
    expect(await requestApproval(request, { timeoutMs: 10 })).toBe(false)
    expect(events.at(-1)?.state).toBe('expired')
    expect(listApprovals('book-a')).toEqual([])
    unsubscribe()
  })
})
