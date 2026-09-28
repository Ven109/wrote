import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

const COURIER = '<w:rFonts w:ascii="Courier New" w:hAnsi="Courier New" w:eastAsia="Courier New" w:cs="Courier New" />'
const escapeXml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const EXTRA_STYLES = `<w:style w:type="paragraph" w:customStyle="1" w:styleId="SceneBreak"><w:name w:val="Scene Break" /><w:basedOn w:val="Normal" /><w:pPr><w:jc w:val="center" /></w:pPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Contact"><w:name w:val="Contact" /><w:basedOn w:val="Normal" /><w:pPr><w:spacing w:line="240" w:lineRule="auto" /></w:pPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Byline"><w:name w:val="Byline" /><w:basedOn w:val="Normal" /><w:pPr><w:jc w:val="center" /></w:pPr></w:style>`

/** Styles for standard manuscript format: Courier 12 pt everywhere, double spaced, ½-inch indents, black headings. */
export function manuscriptStyles(styles: string): string {
  return styles
    .replace(/<w:rFonts [^>]*\/>/g, COURIER)
    .replace(/<w:sz w:val="\d+" \/>/g, '<w:sz w:val="24" />')
    .replace(/<w:szCs w:val="\d+" \/>/g, '<w:szCs w:val="24" />')
    .replace(/<w:color [^>]*\/>/g, '')
    .replace(/<w:b \/>|<w:bCs \/>/g, '')
    .replace(/<w:spacing w:after="200" \/>/, '<w:spacing w:before="0" w:after="0" w:line="480" w:lineRule="auto" />')
    .replace(/<w:spacing w:before="\d+" w:after="\d+" \/>/g, '<w:spacing w:before="0" w:after="0" />')
    .replace(/(w:styleId="(?:BodyText|FirstParagraph)">[\s\S]*?)(<\/w:style>)/g, (_, style: string, end: string) =>
      `${style.includes('<w:pPr>') ? style.replace('<w:pPr>', '<w:pPr><w:ind w:firstLine="720" />') : `${style}<w:pPr><w:ind w:firstLine="720" /></w:pPr>`}${end}`)
    .replace(/(w:styleId="Heading1">[\s\S]*?<w:pPr>)/, '$1<w:pageBreakBefore />')
    .replace(/(w:styleId="Heading1">[\s\S]*?<w:spacing )w:before="0"/, '$1w:before="2880"')
    .replace(/(w:styleId="Heading1">[\s\S]*?<w:pPr>)/, '$1<w:jc w:val="center" />')
    .replace(/(w:styleId="Title">[\s\S]*?<w:spacing )w:before="0"/, '$1w:before="4320"')
    .replace('</w:styles>', `${EXTRA_STYLES}</w:styles>`)
}

/** Running header "Surname / TITLE / page" (right-aligned). */
export function headerXml(surname: string, title: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:p><w:pPr><w:jc w:val="right" /></w:pPr><w:r><w:rPr>${COURIER}<w:sz w:val="24" /></w:rPr><w:t xml:space="preserve">${escapeXml(`${surname} / ${title.toUpperCase()} / `)}</w:t></w:r><w:fldSimple w:instr=" PAGE "><w:r><w:rPr>${COURIER}<w:sz w:val="24" /></w:rPr><w:t>1</w:t></w:r></w:fldSimple></w:p></w:hdr>`
}

const SECTION = '<w:sectPr><w:headerReference w:type="default" r:id="rIdWroteHeader" /><w:pgSz w:w="12240" w:h="15840" /><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0" /><w:titlePg /></w:sectPr>'

/**
 * Turns Pandoc's default reference.docx into a standard manuscript format (Shunn) reference: styles, US Letter
 * with 1-inch margins, and a header with surname, title and page number on every page but the title page.
 */
export function manuscriptReferenceDocx(base: Uint8Array, header: { surname: string, title: string }): Uint8Array {
  const files = unzipSync(base)
  const text = (name: string) => strFromU8(files[name]!)
  files['word/styles.xml'] = strToU8(manuscriptStyles(text('word/styles.xml')))
  files['word/header1.xml'] = strToU8(headerXml(header.surname, header.title))
  files['word/_rels/document.xml.rels'] = strToU8(text('word/_rels/document.xml.rels').replace('</Relationships>',
    '<Relationship Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Id="rIdWroteHeader" Target="header1.xml" /></Relationships>'))
  files['[Content_Types].xml'] = strToU8(text('[Content_Types].xml').replace('</Types>',
    '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml" /></Types>'))
  files['word/document.xml'] = strToU8(text('word/document.xml').replace(/<w:sectPr\s*\/>|<w:sectPr>[\s\S]*?<\/w:sectPr>/, SECTION))
  return zipSync(files)
}

/** Shunn's approximate word count: nearest 100 below 10,000 words, else nearest 1,000. */
export function approximateWords(words: number): string {
  const step = words < 10_000 ? 100 : 1000
  return Math.max(step, Math.round(words / step) * step).toLocaleString('en-US')
}
