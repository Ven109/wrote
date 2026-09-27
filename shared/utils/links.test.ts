import { describe, expect, it } from 'vitest'
import { extractWikiLinks } from './links'

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
