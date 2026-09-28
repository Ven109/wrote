import { describe, expect, it } from 'vitest'
import { mergeTypstLabels, metadataBlock, pandocArgs } from './render'

const config = { version: 1, title: 'The "Map"', author: 'A. Author', language: 'en', template: 'novel', ai: {}, export: { blocks: {} }, timeline: { calendars: [] } } as const

describe('render helpers', () => {
  it('writes metadata as YAML, without the title block when front matter is off', () => {
    expect(metadataBlock(config as never)).toBe('---\ntitle: "The \\"Map\\""\nauthor: "A. Author"\nlang: "en"\n---\n\n')
    expect(metadataBlock(config as never, false)).toBe('---\npagetitle: "The \\"Map\\""\nlang: "en"\n---\n\n')
  })

  it('builds Pandoc arguments per format', () => {
    const input = { withParts: false, frontMatter: true, root: '/book' }
    expect(pandocArgs('epub', input, 'book.epub')).toEqual(expect.arrayContaining(['--toc', '--split-level=1', '--top-level-division=chapter']))
    expect(pandocArgs('epub', { ...input, frontMatter: false }, 'book.epub')).toContain('--epub-title-page=false')
    expect(pandocArgs('html', input, 'book.html')).toContain('--embed-resources')
    expect(pandocArgs('pdf', { ...input, withParts: true }, 'body.typ')).toEqual(expect.arrayContaining(['--to', 'typst', '--top-level-division=part']))
    expect(pandocArgs('pdf', input, 'body.typ')).not.toContain('--standalone')
  })

  it('merges consecutive Typst labels and redirects links to the dropped ones', () => {
    const body = '= The Harbor\n<chp_1>\n<scn_1>\nText #link(<scn_1>)[back] and #link(<chp_2>)[on].'
    expect(mergeTypstLabels(body)).toBe('= The Harbor\n<chp_1>\nText #link(<chp_1>)[back] and #link(<chp_2>)[on].')
  })
})
