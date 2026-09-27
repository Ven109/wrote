import { describe, expect, it } from 'vitest'
import { createNameMatcher } from './name-matcher'

const matcher = createNameMatcher([
  { name: 'Mara', entryId: 'mara' },
  { name: 'Mara Velden', entryId: 'mara' },
  { name: 'The Cartographer', entryId: 'mara' },
  { name: 'Hollow Bay', entryId: 'bay' },
  { name: 'Bay', entryId: 'bay-short' },
  { name: 'Ö', entryId: 'too-short' },
])
const found = (text: string) => matcher.find(text).map(m => [text.slice(m.from, m.to), m.entryId])

describe('createNameMatcher', () => {
  it('finds names and aliases case-insensitively, longest match first', () => {
    expect(found('Mara Velden reached HOLLOW BAY; the cartographer smiled.')).toEqual([
      ['Mara Velden', 'mara'],
      ['HOLLOW BAY', 'bay'],
      ['the cartographer', 'mara'],
    ])
  })

  it('respects word boundaries and possessives', () => {
    expect(found('Tamara and Maras, but Mara’s map and Mara.')).toEqual([['Mara', 'mara'], ['Mara', 'mara']])
    expect(found('Bayside or bay-front, the bay')).toEqual([['bay', 'bay-short']])
  })

  it('handles non-ASCII text with correct offsets', () => {
    const text = '🌊 Mara wartete in der Bucht. Mara!'
    expect(found(text)).toEqual([['Mara', 'mara'], ['Mara', 'mara']])
  })

  it('ignores one-letter names and empty input', () => {
    expect(found('Ö')).toEqual([])
    expect(createNameMatcher([]).find('anything')).toEqual([])
  })

  it('scans a 10k-word text quickly with many names', () => {
    const many = createNameMatcher(Array.from({ length: 2000 }, (_, i) => ({ name: `Person${i} Surname${i}`, entryId: `e${i}` })).concat({ name: 'Mara', entryId: 'mara' }))
    const text = Array.from({ length: 1000 }, () => 'The tide was out when Mara reached the harbor again today.').join(' ')
    const started = performance.now()
    const matches = many.find(text)
    const elapsed = performance.now() - started
    expect(matches).toHaveLength(1000)
    expect(elapsed).toBeLessThan(100)
  })
})
