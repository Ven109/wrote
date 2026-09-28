/** Default stylesheet of EPUB and HTML exports; `sceneBreak` is drawn for scene breaks. */
export function bookCss(sceneBreak = '* * *'): string {
  return `body { font-family: Georgia, "Iowan Old Style", serif; line-height: 1.55; max-width: 36em; margin: 0 auto; padding: 0 1em; }
h1, h2, h3 { font-weight: normal; text-align: center; }
h1 { margin: 3em 0 1.5em; }
section.part > h1, h1.part { margin-top: 30%; }
p { margin: 0; text-indent: 1.2em; }
h1 + p, h2 + p, h3 + p, hr + div > p:first-child, h1 + div > p:first-child, h2 + div > p:first-child, .callout p { text-indent: 0; }
hr { border: 0; text-align: center; margin: 1.2em 0; }
hr::after { content: ${JSON.stringify(sceneBreak)}; letter-spacing: 0.5em; }
blockquote { margin: 1em 2em; font-style: italic; }
.callout { border-left: 3px solid #999; padding: 0.5em 1em; margin: 1em 0; }
header#title-block-header { text-align: center; margin: 4em 0; }
nav#TOC ol, nav#toc ol { list-style: none; }
section.copyright > h1, section.dedication > h1, section.epigraph > h1 { display: none; }
section.copyright p { text-indent: 0; font-size: 0.85em; margin-top: 60%; }
section.dedication p, section.epigraph p { text-indent: 0; text-align: center; font-style: italic; margin-top: 30%; }
`
}

/** Helpers Pandoc's Typst output uses, shared by both templates. */
const HELPERS = `#let scene-break-symbol = state("scene-break", "* * *")
#let horizontalrule = context align(center, block(above: 1.4em, below: 1.4em, text(tracking: 0.3em, scene-break-symbol.get())))
#let blockquote(body) = pad(x: 1.5em, emph(body))
`

/**
 * Book template (trade layout): trim size, margins, font and spacing come from the export preset. Front matter
 * (title page, matter pages, contents) and back matter are separate functions, called in preset order.
 */
export const BOOK_TYP = `${HELPERS}
#let book(width: 148mm, height: 210mm, inside: 0.75in, outside: 0.6in, top: 0.7in, bottom: 0.75in, font: "Libertinus Serif", size: 10.5pt, spacing: 1.35, chapter-style: "centered", parts: false, lang: "en", title: none, author: none, scene-break: "* * *", body) = {
  set document(title: title, author: if author == none { () } else { author })
  scene-break-symbol.update(scene-break)
  set text(font: (font, "Libertinus Serif"), size: size, lang: lang)
  set par(justify: true, first-line-indent: 1.2em, leading: calc.max(0.3, spacing - 0.7) * 1em, spacing: calc.max(0.3, spacing - 0.7) * 1em)
  set page(width: width, height: height, margin: (inside: inside, outside: outside, top: top, bottom: bottom), numbering: none)
  set footnote.entry(separator: line(length: 25%, stroke: 0.4pt))
  let chapter = if parts { 2 } else { 1 }
  let chapters = counter("wrote-chapter")
  show heading: set text(weight: "regular")
  show heading.where(level: 1): it => if parts {
    pagebreak(weak: true, to: "odd")
    v(30%)
    align(center, text(size: 2.1em, it.body))
    pagebreak()
  } else { it }
  show heading.where(level: chapter): it => {
    pagebreak(weak: true)
    v(18%)
    if chapter-style == "left" {
      text(size: 1.8em, it.body)
    } else if chapter-style == "numbered" {
      chapters.step()
      align(center)[#text(size: 0.9em, tracking: 0.15em, upper[Chapter #context chapters.display("1")]) \\ #v(0.4em) #text(size: 1.7em, it.body)]
    } else {
      align(center, text(size: 1.8em, it.body))
    }
    v(2.5em)
  }
  show heading.where(level: chapter + 1): it => align(center, text(size: 1.1em, style: "italic", it.body))
  body
}

#let titlepage(title: none, subtitle: none, author: none) = page(align(center + horizon)[
  #text(size: 2.5em, title)
  #if subtitle != none { v(0.6em); text(size: 1.3em, style: "italic", subtitle) }
  #if author != none { v(3em); text(size: 1.2em, author) }
])

#let matterpage(kind, body) = page(
  if kind == "copyright" { align(bottom, text(size: 0.85em, body)) }
  else if kind == "dedication" or kind == "epigraph" { align(center + horizon, emph(body)) }
  else { body }
)

#let contents(depth: 1) = page(outline(title: "Contents", depth: depth, indent: 1em))

#let backpage(title, body) = {
  pagebreak(weak: true)
  v(18%)
  align(center, text(size: 1.8em, title))
  v(2.5em)
  body
}
`

/**
 * Standard manuscript format (Shunn): US Letter, 1-inch margins, 12 pt Courier, double spaced, ragged right,
 * ½-inch indents, header "Surname / TITLE / page" from page 2, title page with contact and word count,
 * chapters on new pages a third down.
 */
export const MANUSCRIPT_TYP = `${HELPERS}
#let manuscript(title: "", author: "", surname: "", words: "", lang: "en", scene-break: "#", body) = {
  set document(title: title, author: author)
  scene-break-symbol.update(scene-break)
  set text(font: ("Courier New", "Courier Prime", "Liberation Mono", "DejaVu Sans Mono"), size: 12pt, lang: lang)
  set par(justify: false, first-line-indent: 0.5in, leading: 1.3em, spacing: 1.3em)
  set page(paper: "us-letter", margin: 1in, header: context if counter(page).get().first() > 1 {
    align(right)[#surname / #upper(title) / #counter(page).display()]
  })
  show heading: it => {
    pagebreak(weak: true)
    v(2in)
    align(center, text(weight: "regular", it.body))
    v(1.3em)
  }
  page(header: none)[
    #grid(columns: (1fr, 1fr), author, align(right)[about #words words])
    #v(3in)
    #align(center)[#upper(title) \\ \\ by #author]
  ]
  body
}
`
