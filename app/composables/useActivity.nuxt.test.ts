import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError, getQuery, readBody } from 'h3'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import type { ActivityEntry } from '#shared/schemas/activity'
import { useActivity } from './useActivity'

const entry = (id: string, tool: string): ActivityEntry => ({
  id, tool, toolTitle: 'Create a note', createdAt: '2026-09-27T10:00:00.000Z', actor: { kind: 'mcp', name: 'Cursor' }, permission: 'write',
  input: {}, changes: [{ path: 'notes/inbox/a.md', before: null, after: 'x' }], undoable: true, undoneAt: null, undoOf: null,
})
const queries: unknown[] = []
const undos: unknown[] = []
registerEndpoint('/api/books/act-book/activity', (event) => {
  const query = getQuery(event)
  queries.push(query)
  return query.tool === 'create_note' ? [entry('act_1', 'create_note')] : [entry('act_1', 'create_note'), entry('act_2', 'rewrite')]
})
registerEndpoint('/api/books/act-book/activity/act_1/undo', { method: 'POST', handler: async (event) => {
  const body = await readBody<{ force: boolean }>(event)
  undos.push(body)
  if (!body.force) throw createError({ statusCode: 409, statusMessage: 'Changed since: notes/inbox/a.md' })
  return {}
} })

async function mount() {
  let activity!: ReturnType<typeof useActivity>
  await mountSuspended(defineComponent({
    setup() {
      activity = useActivity('act-book')
      return () => h('div')
    },
  }))
  await vi.waitFor(() => expect(activity.entries.value).toHaveLength(2))
  return activity
}

describe('useActivity', () => {
  it('filters by tool and keeps the tool options', async () => {
    const activity = await mount()
    activity.filters.tool = 'create_note'
    await vi.waitFor(() => expect(activity.entries.value).toHaveLength(1))
    expect(queries.at(-1)).toEqual({ tool: 'create_note' })
    expect(activity.tools.value).toEqual(['create_note', 'rewrite'])
  })

  it('asks before an undo that would discard later edits, then forces it', async () => {
    const activity = await mount()
    await activity.undo(activity.entries.value[0]!)
    expect(activity.conflict.value?.message).toContain('Changed since')
    await activity.forceUndo()
    expect(undos).toEqual([{ force: false }, { force: true }])
    expect(activity.conflict.value).toBeNull()
  })
})
