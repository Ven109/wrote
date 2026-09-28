# Export

**Export book** (download icon in the top bar, or ⌘K → *Export book…*) compiles the manuscript into one file:

| Format | Needs | Notes |
|---|---|---|
| EPUB | Pandoc | EPUB 3, one file per chapter, table of contents, cover from `cover.jpg`/`cover.png` in the book folder; passes epubcheck |
| PDF | Pandoc + Typst | A5 book layout: title page, contents, chapters on new pages, page numbers, footnotes |
| Word (DOCX) | Pandoc | For editors, agents and publishers |
| HTML | Pandoc | One self-contained page (styles and images embedded) |
| Markdown | – | The compiled manuscript with a metadata header; always available |

Options: a **preset**, **whole book or selected chapters**, and **front and back matter**.

## Presets

A preset is a named set of layout options. Built-in:

| Preset | For |
|---|---|
| Default | Ebook and A5 PDF with title page, copyright, dedication, contents, acknowledgements, about the author |
| Print 5 × 8 in, 5.5 × 8.5 in, 6 × 9 in | Print-ready PDFs (trim size, gutter margins, font size) |
| Standard manuscript (Shunn) | DOCX/PDF for agents and publishers: 12 pt Courier, double spaced, ½-inch indents, header *Surname / TITLE / page*, contact and word count on the title page, `#` scene breaks, chapters on new pages |

Books add their own as YAML in `.wrote/presets/<id>.yaml` (the export dialog's *Save as new preset…* writes one;
*Download preset file* / *Import preset file…* share presets between books). Invalid files are listed in the dialog
with what is wrong.

```yaml
name: Large print 6x9
description: For readers who like it big.
formats: [pdf]              # first = default format
manuscript: false           # true: standard manuscript format (DOCX, PDF)
sceneBreak: "* * *"
pdf:
  trim: 6x9                 # 5x8 · 5.5x8.5 · 6x9 · a5 · a4 · letter
  margins: { inside: 0.9in, outside: 0.6in, top: 0.75in, bottom: 0.8in }
  font: Libertinus Serif
  fontSize: 14
  lineSpacing: 1.4
  chapterStyle: numbered    # centered · left · numbered
frontMatter: [title, copyright, dedication, epigraph, toc]
backMatter: [acknowledgements, about-the-author]
```

## Front and back matter

Sections appear in the preset's order when *Front and back matter* is on. Their text comes from the book's
`matter/` folder – `copyright.md`, `dedication.md`, `epigraph.md`, `acknowledgements.md`, `about-the-author.md`.
Without `copyright.md` a copyright line is generated from the author and year; other sections without a file are
left out. The title page uses the book's title, subtitle and author.

## What the compiler does

1. Takes parts, chapters and scenes in book order (parts are shown as headings only when the book has more than one).
2. Separates scenes with a scene break; chapter and scene ids become anchors.
3. Leaves out working blocks per the book's export settings (notes and codex cards by default; see *Book settings →
   Export*) and hidden `<!-- -->` notes; kept blocks (callouts) become styled sections.
4. Turns `[[links]]` to chapters and scenes in the export into internal links; other links become plain text.
5. Keeps footnotes (`[^1]`) of different scenes apart and moves headings inside scenes below the chapter heading.
6. Resolves images relative to the scene's folder.

Code: `server/export/` (Markdown transforms, templates, Pandoc/Typst runner), `server/services/export-compile.ts`.

## Installing Pandoc and Typst

Wrote looks for `pandoc` and `typst` on the `PATH`, or at `WROTE_PANDOC_PATH` / `WROTE_TYPST_PATH`. The export dialog
shows what is missing with an install command for your system (*Check again* after installing):

- macOS: `brew install pandoc typst`
- Windows: `winget install --id JohnMacFarlane.Pandoc` and `winget install --id Typst.Typst`
- Linux: `sudo apt install pandoc`, Typst from [its releases](https://github.com/typst/typst/releases)

The Docker image ships both.

## CI

The *Export check* job exports the sample book to every format and validates the EPUB with epubcheck
(`pnpm export:check` with `EPUBCHECK_JAR` set).
