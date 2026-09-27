import { describe, expect, it } from 'vitest'
import { describeToolPart, isToolPart } from './tool-parts'

describe('describeToolPart', () => {
  it('labels a finished search and links the hits', () => {
    const view = describeToolPart('b', {
      type: 'tool-search',
      state: 'output-available',
      input: { query: 'harbor' },
      output: [{ title: 'Arrival', path: 'manuscript/a/b/01-arrival.md', type: 'scene' }, { junk: true }],
    })
    expect(view).toMatchObject({ name: 'search', label: 'Searched “harbor”', running: false, failed: false })
    expect(view.entries).toEqual([{ title: 'Arrival', href: '/books/b/write/manuscript/a/b/01-arrival.md' }])
  })

  it('reports running and failed calls and unknown tools', () => {
    expect(describeToolPart('b', { type: 'tool-read_entry', state: 'input-available', input: { path: 'x.md' } })).toMatchObject({ running: true, label: 'Read x.md' })
    expect(describeToolPart('b', { type: 'tool-custom_thing', state: 'output-error', errorText: 'boom' })).toMatchObject({ failed: true, error: 'boom', label: 'custom thing' })
  })

  it('recognizes tool parts', () => {
    expect(isToolPart({ type: 'tool-search' })).toBe(true)
    expect(isToolPart({ type: 'text' })).toBe(false)
  })
})
