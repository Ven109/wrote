import { describe, expect, it } from 'vitest'
import { extractWikiLinks, formatWikiLink, matchWikiLinkAt } from './links'

describe('extractWikiLinks', () => {
  it('extracts plain and labelled links', () => {
    expect(extractWikiLinks('See [[Hollow Bay]] and [[cdx_mara000001|Mara]].')).toEqual([
      { target: 'Hollow Bay', label: null },
      { target: 'cdx_mara000001', label: 'Mara' },
    ])
  })

  it('ignores malformed links', () => {
    expect(extractWikiLinks('[[ ]] [[a\nb]] [single] [[]]')).toEqual([])
  })
})

describe('matchWikiLinkAt', () => {
  it('matches only at the start', () => {
    expect(matchWikiLinkAt('[[Mara|M]] rest')).toEqual({ raw: '[[Mara|M]]', link: { target: 'Mara', label: 'M' } })
    expect(matchWikiLinkAt('x [[Mara]]')).toBeNull()
    expect(matchWikiLinkAt('[[ ]]')).toBeNull()
  })
})

describe('formatWikiLink', () => {
  it('round-trips with the parser', () => {
    for (const raw of ['[[Hollow Bay]]', '[[cdx_mara000001|Mara]]']) {
      expect(formatWikiLink(matchWikiLinkAt(raw)!.link)).toBe(raw)
    }
  })
})
