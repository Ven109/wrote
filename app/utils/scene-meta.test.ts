import { describe, expect, it } from 'vitest'
import { metaFormFrom, metaPatchFrom } from './scene-meta'

describe('scene meta form', () => {
  it('fills defaults from frontmatter', () => {
    expect(metaFormFrom({ id: 'x', pov: 'Mara', tags: ['a', 3] })).toEqual({ status: 'draft', pov: 'Mara', location: '', timeline: '', synopsis: '', tags: ['a'] })
  })

  it('clears blank fields in the patch', () => {
    const form = { ...metaFormFrom({}), pov: '  ', location: 'Harbor', tags: [' x ', ''] }
    expect(metaPatchFrom(form)).toEqual({ status: 'draft', pov: null, location: 'Harbor', timeline: null, synopsis: null, tags: ['x'] })
  })
})
