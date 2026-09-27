import { describe, expect, it } from 'vitest'
import { slugify } from './slug'

describe('slugify', () => {
  it.each([
    ['The Harbor', 'the-harbor'],
    ['  Idea – the lighthouse!  ', 'idea-the-lighthouse'],
    ['Über Straße', 'uber-strasse'],
    ['Café naïve', 'cafe-naive'],
    ['???', 'untitled'],
  ])('slugifies %j to %j', (title, slug) => {
    expect(slugify(title)).toBe(slug)
  })

  it('limits length without trailing dashes', () => {
    expect(slugify('a'.repeat(10) + ' ' + 'b'.repeat(10), 11)).toBe('aaaaaaaaaa')
  })
})
