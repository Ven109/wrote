import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { approximateWords, headerXml, manuscriptReferenceDocx, manuscriptStyles } from './reference-docx'

const STYLES = `<w:styles><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:asciiTheme="minorHAnsi" /><w:sz w:val="24" /></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="200" /></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:styleId="BodyText"><w:name w:val="Body Text" /><w:pPr><w:spacing w:before="180" w:after="180" /></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:pPr><w:spacing w:before="480" w:after="0" /></w:pPr><w:rPr><w:b /><w:color w:val="4F81BD" /><w:sz w:val="32" /></w:rPr></w:style></w:styles>`

describe('manuscript reference docx', () => {
  it('sets Courier 12 pt, double spacing, indents and chapter page breaks', () => {
    const styles = manuscriptStyles(STYLES)
    expect(styles).toContain('w:ascii="Courier New"')
    expect(styles).toContain('w:line="480"')
    expect(styles).toMatch(/styleId="BodyText">.*<w:ind w:firstLine="720" \/>/s)
    expect(styles).toMatch(/styleId="Heading1">.*<w:pageBreakBefore \/>/s)
    expect(styles).not.toContain('w:val="32"')
    expect(styles).not.toContain('<w:color')
    expect(styles).toContain('w:styleId="SceneBreak"')
  })

  it('adds a running header with surname, title and page', () => {
    expect(headerXml('Velden', 'The <Map>')).toContain('Velden / THE &lt;MAP&gt; / ')
    const base = zipSync({
      'word/styles.xml': strToU8(STYLES),
      'word/document.xml': strToU8('<w:document><w:body><w:sectPr /></w:body></w:document>'),
      'word/_rels/document.xml.rels': strToU8('<Relationships></Relationships>'),
      '[Content_Types].xml': strToU8('<Types></Types>'),
    })
    const files = unzipSync(manuscriptReferenceDocx(base, { surname: 'Velden', title: 'Map' }))
    expect(strFromU8(files['word/header1.xml']!)).toContain('PAGE')
    expect(strFromU8(files['word/document.xml']!)).toContain('<w:headerReference w:type="default" r:id="rIdWroteHeader" />')
    expect(strFromU8(files['word/_rels/document.xml.rels']!)).toContain('Target="header1.xml"')
    expect(strFromU8(files['[Content_Types].xml']!)).toContain('/word/header1.xml')
  })

  it('rounds word counts the way manuscripts state them', () => {
    expect([approximateWords(40), approximateWords(3449), approximateWords(81_600)]).toEqual(['100', '3,400', '82,000'])
  })
})
