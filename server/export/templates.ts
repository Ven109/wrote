/** Default stylesheet of EPUB and HTML exports. */
export const BOOK_CSS = `body { font-family: Georgia, "Iowan Old Style", serif; line-height: 1.55; max-width: 36em; margin: 0 auto; padding: 0 1em; }
h1, h2, h3 { font-weight: normal; text-align: center; }
h1 { margin: 3em 0 1.5em; }
h1.part, section.part > h1 { margin-top: 30%; }
p { margin: 0; text-indent: 1.2em; }
h1 + p, h2 + p, h3 + p, hr + div > p:first-child, h1 + div > p:first-child, h2 + div > p:first-child, .callout p { text-indent: 0; }
hr { border: 0; text-align: center; margin: 1.2em 0; }
hr::after { content: "* * *"; letter-spacing: 0.5em; }
blockquote { margin: 1em 2em; font-style: italic; }
.callout { border-left: 3px solid #999; padding: 0.5em 1em; margin: 1em 0; }
.title-block-header, header#title-block-header { text-align: center; margin: 4em 0; }
nav#TOC ol, nav#toc ol { list-style: none; }
`

/**
 * Default Typst book template (A5, serif, centered chapter openings, page numbers, footnotes). Pandoc's
 * Typst output is appended after `#show: book.with(...)`, so helpers it uses are defined here.
 */
export const BOOK_TYP = `#let horizontalrule = align(center, block(above: 1.4em, below: 1.4em, text(tracking: 0.5em)[\\* \\* \\*]))
#let blockquote(body) = pad(x: 1.5em, emph(body))
#let endnote(body) = footnote(body)

#let book(title: none, subtitle: none, author: none, lang: "en", toc: true, titlepage: true, parts: false, body) = {
  set document(title: title, author: if author == none { () } else { author })
  set text(font: ("Libertinus Serif", "New Computer Modern"), size: 10.5pt, lang: lang)
  set par(justify: true, first-line-indent: 1.2em, leading: 0.68em, spacing: 0.68em)
  set page(paper: "a5", margin: (inside: 2.2cm, outside: 1.7cm, top: 2cm, bottom: 2.2cm), numbering: none)
  set footnote.entry(separator: line(length: 25%, stroke: 0.4pt))
  show link: it => it
  let chapter = if parts { 2 } else { 1 }
  show heading: set text(weight: "regular")
  show heading.where(level: 1): it => if parts {
    pagebreak(weak: true, to: "odd")
    v(30%)
    align(center, text(size: 22pt, it.body))
    pagebreak()
  } else { it }
  show heading.where(level: chapter): it => {
    pagebreak(weak: true)
    v(18%)
    align(center, text(size: 19pt, it.body))
    v(2.5em)
  }
  show heading.where(level: chapter + 1): it => align(center, text(size: 12pt, style: "italic", it.body))
  if titlepage and title != none {
    page(align(center + horizon)[
      #text(size: 26pt, title)
      #if subtitle != none { v(0.6em); text(size: 14pt, style: "italic", subtitle) }
      #if author != none { v(3em); text(size: 13pt, author) }
    ])
  }
  if toc {
    page(outline(title: none, depth: chapter, indent: 1em))
  }
  set page(numbering: "1", number-align: center)
  counter(page).update(1)
  body
}
`
