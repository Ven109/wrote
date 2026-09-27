import { describe, expect, it } from 'vitest'
import { mergeFrontmatterForWrite } from './frontmatter-merge'

describe('mergeFrontmatterForWrite', () => {
  const defaults = { tags: [], pinned: false }

  it('keeps on-disk key order and appends new keys', () => {
    const merged = mergeFrontmatterForWrite({ title: 'A', id: 'x' }, { id: 'x', title: 'B', pov: 'Mara' }, defaults)
    expect(Object.keys(merged)).toEqual(['title', 'id', 'pov'])
    expect(merged.title).toBe('B')
  })

  it('does not write implicit defaults', () => {
    expect(mergeFrontmatterForWrite({ id: 'x' }, { id: 'x', tags: [], pinned: false }, defaults)).toEqual({ id: 'x' })
  })

  it('keeps defaults that were explicit on disk and non-default values', () => {
    const merged = mergeFrontmatterForWrite({ id: 'x', tags: [] }, { id: 'x', tags: [], pinned: true }, defaults)
    expect(merged).toEqual({ id: 'x', tags: [], pinned: true })
  })

  it('drops undefined values and removed keys', () => {
    expect(mergeFrontmatterForWrite({ id: 'x', pov: 'M' }, { id: 'x', pov: undefined }, defaults)).toEqual({ id: 'x' })
  })
})
