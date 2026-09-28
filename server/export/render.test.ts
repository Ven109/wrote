import { describe, expect, it } from 'vitest'
import { BUILTIN_PRESETS } from './builtin-presets'
import { metadataBlock, pandocArgs, pandocDocument, type RenderInput } from './render'
import { mergeTypstLabels, typstBookOptions } from './typst'

const config = { version: 1, title: 'The "Map"', author: 'Ann Velden', language: 'en', template: 'novel', ai: {}, export: { blocks: {} }, timeline: { calendars: [] } } as never
const matter = { title: true, toc: true, front: [{ id: 'dedication' as const, title: 'Dedication', markdown: 'For M.' }], back: [{ id: 'about-the-author' as const, title: 'About the Author', markdown: 'Sea.' }] }
const input = (patch: Partial<RenderInput> = {}): RenderInput => ({ markdown: '# One {#c1}\n\nA.\n\n* * *\n\nB.\n', config, withParts: false, words: 3449, preset: BUILTIN_PRESETS.default!, matter, root: '/book', ...patch })

describe('render helpers', () => {
  it('writes metadata as YAML, without the title block when there is no title page', () => {
    expect(metadataBlock(config)).toBe('---\ntitle: "The \\"Map\\""\nauthor: "Ann Velden"\nlang: "en"\n---\n\n')
    expect(metadataBlock(config, false)).toBe('---\npagetitle: "The \\"Map\\""\nlang: "en"\n---\n\n')
  })

  it('builds Pandoc arguments per format', () => {
    const args = { withParts: false, toc: true, titlePage: true, root: '/book' }
    expect(pandocArgs('epub', args, 'book.epub')).toEqual(expect.arrayContaining(['--toc', '--split-level=1', '--top-level-division=chapter']))
    expect(pandocArgs('epub', { ...args, titlePage: false }, 'book.epub')).toContain('--epub-title-page=false')
    expect(pandocArgs('html', args, 'book.html')).toContain('--embed-resources')
    expect(pandocArgs('docx', args, 'book.docx')).toContain('--reference-doc=reference.docx')
    expect(pandocArgs('pdf', { ...args, withParts: true }, 'body.typ')).toEqual(expect.arrayContaining(['--to', 'typst', '--top-level-division=part']))
  })

  it('puts front matter before and back matter after the manuscript', () => {
    const doc = pandocDocument('epub', input())
    expect(doc.indexOf('# Dedication {.unnumbered .unlisted .dedication}')).toBeLessThan(doc.indexOf('# One'))
    expect(doc.indexOf('# One')).toBeLessThan(doc.indexOf('# About the Author'))
  })

  it('writes a manuscript DOCX title page with the word count and # scene breaks', () => {
    const doc = pandocDocument('docx', input({ preset: BUILTIN_PRESETS.manuscript! }))
    expect(doc).toContain('Ann Velden\\\nabout 3,400 words')
    expect(doc).toContain('::: {custom-style="Title"}\nTHE "MAP"\n:::')
    expect(doc).toContain('::: {custom-style="Scene Break"}\n\\#\n:::')
    expect(doc).not.toContain('Dedication')
  })

  it('lays out the PDF from the preset', () => {
    const options = typstBookOptions({ config, preset: BUILTIN_PRESETS['print-6x9']!, withParts: false })
    expect(options).toContain('width: 6in, height: 9in')
    expect(options).toContain('inside: 0.875in')
    expect(options).toContain('size: 11pt')
  })

  it('merges consecutive Typst labels and redirects links to the dropped ones', () => {
    const body = '= The Harbor\n<chp_1>\n<scn_1>\nText #link(<scn_1>)[back] and #link(<chp_2>)[on].'
    expect(mergeTypstLabels(body)).toBe('= The Harbor\n<chp_1>\nText #link(<chp_1>)[back] and #link(<chp_2>)[on].')
  })
})
