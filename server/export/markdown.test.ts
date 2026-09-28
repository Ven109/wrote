import { describe, expect, it } from 'vitest'
import { DEFAULT_BLOCK_EXPORT } from '#shared/utils/directives'
import { directivesToDivs, prefixFootnotes, prepareBody, resolveImages, resolveWikiLinks, shiftHeadings } from './markdown'

const links = { anchors: new Map([['chp_harb0r0001', 'chp_harb0r0001'], ['the harbor', 'chp_harb0r0001']]) }

describe('export Markdown transforms', () => {
  it('links to chapters in the export and keeps other link targets as text', () => {
    expect(resolveWikiLinks('See [[The Harbor]], [[chp_harb0r0001|back then]] and [[Hollow Bay]].', links))
      .toBe('See [The Harbor](#chp_harb0r0001), [back then](#chp_harb0r0001) and Hollow Bay.')
  })

  it('makes footnote labels unique per scene', () => {
    expect(prefixFootnotes('Salt.[^1]\n\n[^1]: Tar, too.', 's2')).toBe('Salt.[^s2-1]\n\n[^s2-1]: Tar, too.')
  })

  it('nests headings below the chapter and converts kept blocks to Pandoc divs', () => {
    expect(shiftHeadings('# Aside\n\n###### Deep', 1)).toBe('## Aside\n\n###### Deep')
    expect(directivesToDivs(':::callout{variant=tip}\nTides.\n:::\n::youtube{id=abc}\nAfter')).toBe('::: {.callout variant="tip"}\nTides.\n:::\nAfter')
  })

  it('resolves relative images only', () => {
    const resolve = (src: string) => `/book/scenes/${src}`
    expect(resolveImages('![Map](images/map.png "The map") ![Web](https://x.test/a.png)', resolve))
      .toBe('![Map](/book/scenes/images/map.png "The map") ![Web](https://x.test/a.png)')
  })

  it('prepares a scene: strips working blocks and hidden notes, leaves code alone', () => {
    const body = [
      'Mara reached [[The Harbor]].[^1]',
      '',
      ':::note{todo=open}',
      'Check the lamp.',
      ':::',
      '',
      '<!-- hidden -->',
      '',
      '::codex-card{id=cdx_mara000001}',
      '',
      '```md',
      '[[Not a link]] <!-- kept -->',
      '```',
      '',
      '[^1]: A footnote.',
    ].join('\n')
    expect(prepareBody(body, { policy: DEFAULT_BLOCK_EXPORT, footnotePrefix: 's1', links, headingShift: 1 })).toBe([
      'Mara reached [The Harbor](#chp_harb0r0001).[^s1-1]',
      '',
      '```md',
      '[[Not a link]] <!-- kept -->',
      '```',
      '',
      '[^s1-1]: A footnote.',
    ].join('\n'))
  })
})
