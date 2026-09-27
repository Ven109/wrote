import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import type { ActivityEntry } from '#shared/schemas/activity'
import ActivityEntryCard from './ActivityEntryCard.vue'

const entry: ActivityEntry = {
  id: 'act_1', tool: 'create_note', toolTitle: 'Create a note', createdAt: '2026-09-27T10:00:00.000Z', actor: { kind: 'mcp', name: 'Cursor' },
  permission: 'write', input: {}, changes: [{ path: 'notes/inbox/idea.md', before: null, after: 'Storm at sea' }], undoable: true, undoneAt: null, undoOf: null,
}

describe('ActivityEntryCard', () => {
  it('shows who changed which file, the diff when expanded, and emits undo', async () => {
    const card = await mountSuspended(ActivityEntryCard, { props: { entry, expanded: true, busy: false } })
    expect(card.text()).toContain('Cursor')
    expect(card.text()).toContain('created notes/inbox/idea.md')
    expect(card.text()).toContain('Storm at sea')
    await card.get('button[aria-label="Undo create a note by Cursor"]').trigger('click')
    expect(card.emitted('undo')).toHaveLength(1)
  })

  it('offers no undo once undone', async () => {
    const card = await mountSuspended(ActivityEntryCard, { props: { entry: { ...entry, undoneAt: '2026-09-27T11:00:00.000Z' }, expanded: false, busy: false } })
    expect(card.text()).toContain('Undone')
    expect(card.find('button[aria-label^="Undo"]').exists()).toBe(false)
  })
})
