import { describe, expect, it } from 'vitest'
import { anchorContext, locateAnchor } from './text-anchor'

describe('text anchors', () => {
  it('finds a unique passage and reports missing ones as stale', () => {
    expect(locateAnchor('The tide was out.', 'tide')).toEqual({ from: 4, to: 8 })
    expect(locateAnchor('The tide was out.', 'harbor')).toBeNull()
    expect(locateAnchor('anything', '')).toBeNull()
  })

  it('tells repeated passages apart by their surroundings', () => {
    const text = 'She waited. The door opened. He waited. The door closed.'
    const second = { from: text.lastIndexOf('The door'), to: text.lastIndexOf('The door') + 8 }
    const context = anchorContext(text, second)
    expect(context).toEqual({ before: 'She waited. The door opened. He waited. ', after: ' closed.' })
    expect(locateAnchor(text, 'The door', context)).toEqual(second)
  })

  it('follows the passage after edits elsewhere', () => {
    const text = 'She waited. The door opened. He waited. The door closed.'
    const context = anchorContext(text, { from: 40, to: 48 })
    const edited = `A new first line. ${text.replace('He waited', 'He paced')}`
    const found = locateAnchor(edited, 'The door', context)!
    expect(edited.slice(found.from, found.to + 7)).toBe('The door closed')
  })
})
