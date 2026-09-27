import { describe, expect, it } from 'vitest'
import { formatOrderedName, parseOrderedName } from './order'

describe('ordered names', () => {
  it('parses order prefixes', () => {
    expect(parseOrderedName('03-the-map')).toEqual({ order: 3, slug: 'the-map' })
    expect(parseOrderedName('120-late')).toEqual({ order: 120, slug: 'late' })
  })

  it('returns null order for unprefixed names', () => {
    expect(parseOrderedName('notes')).toEqual({ order: null, slug: 'notes' })
  })

  it('formats with zero padding and round-trips', () => {
    expect(formatOrderedName(3, 'the-map')).toBe('03-the-map')
    expect(parseOrderedName(formatOrderedName(42, 'x'))).toEqual({ order: 42, slug: 'x' })
  })
})
