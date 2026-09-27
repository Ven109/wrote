import { describe, expect, it } from 'vitest'
import { extractWikiLinks, formatWikiLink, linkContext, matchWikiLinkAt, renameWikiLinks } from './links'

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

describe('renameWikiLinks', () => {
  it('rewrites matching targets case-insensitively and keeps labels', () => {
    const { markdown, count } = renameWikiLinks('See [[hollow bay]], [[Hollow Bay|the bay]] and [[Mara]].', 'Hollow Bay', 'Hollow Harbor')
    expect(markdown).toBe('See [[Hollow Harbor]], [[Hollow Harbor|the bay]] and [[Mara]].')
    expect(count).toBe(2)
  })

  it('leaves unrelated text untouched', () => {
    expect(renameWikiLinks('No links. [single]', 'x', 'y')).toEqual({ markdown: 'No links. [single]', count: 0 })
  })
})

describe('linkContext', () => {
  it('returns text around the first matching link', () => {
    const text = `${'a '.repeat(50)}reached [[Hollow Bay]] at dawn`
    const context = linkContext(text, ['hollow bay'], 10)!
    expect(context).toMatch(/^….*\[\[Hollow Bay\]\] at dawn$/)
    expect(linkContext('[[Other]]', ['hollow bay'])).toBeNull()
  })
})
