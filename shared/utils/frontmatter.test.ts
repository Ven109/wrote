import { describe, expect, it } from 'vitest'
import { parseMarkdownFile, stringifyMarkdownFile } from './frontmatter'

describe('parseMarkdownFile', () => {
  it('splits frontmatter and body', () => {
    const file = parseMarkdownFile('---\nid: scn_abcdef\ntitle: Arrival\n---\nThe tide was out.\n')
    expect(file.data).toEqual({ id: 'scn_abcdef', title: 'Arrival' })
    expect(file.body).toBe('The tide was out.\n')
  })

  it('treats files without frontmatter as body only', () => {
    expect(parseMarkdownFile('Just text')).toEqual({ data: {}, body: 'Just text' })
  })

  it('rejects frontmatter that is not a mapping', () => {
    expect(() => parseMarkdownFile('---\n- a\n- b\n---\n')).toThrow(/mapping/)
  })

  it('rejects invalid YAML', () => {
    expect(() => parseMarkdownFile('---\ntitle: [unclosed\n---\n')).toThrow(/Invalid frontmatter/)
  })
})

describe('stringifyMarkdownFile', () => {
  it('round-trips data, key order and unknown fields', () => {
    const source = '---\nid: cdx_mara000001\ntitle: Mara\ncustomField: kept\ntags:\n  - a\n---\nBody\n'
    expect(stringifyMarkdownFile(parseMarkdownFile(source))).toBe(source)
  })

  it('omits undefined values and empty frontmatter', () => {
    expect(stringifyMarkdownFile({ data: { a: undefined }, body: 'x' })).toBe('x')
  })
})
