import { describe, expect, it } from 'vitest'
import type { CodexProposal } from '#shared/schemas/codex-proposals'
import { displayValue, draftFrom, editsFrom, scanTargets } from './codex-proposals'

const proposal = { title: 'Tobin', aliases: ['Old Tobin'], description: 'Harbour master.', fields: { role: 'minor', features: ['a', 'b'] } } as unknown as CodexProposal

describe('codex proposal helpers', () => {
  it('sends only the edited parts of a draft', () => {
    const draft = draftFrom(proposal)
    expect(editsFrom(proposal, draft)).toEqual({})
    draft.title = ' Tobin Hale '
    draft.fields.role = 'supporting'
    expect(editsFrom(proposal, draft)).toEqual({ title: 'Tobin Hale', fields: { role: 'supporting', features: ['a', 'b'] } })
  })

  it('lists chapters with their part', () => {
    const tree = [{ id: 'prt_1', title: 'One', type: 'part', path: '', wordCount: 0, children: [{ id: 'chp_1', title: 'Harbor', type: 'chapter', path: '', wordCount: 0, children: [] }] }] as never
    expect(scanTargets(tree)).toEqual([{ label: 'One › Harbor', value: 'chp_1' }])
  })

  it('shows entry ids as titles', () => {
    expect(displayValue(['cdx_1', 'x'], id => (id === 'cdx_1' ? 'Mara' : undefined))).toBe('Mara, x')
  })
})
