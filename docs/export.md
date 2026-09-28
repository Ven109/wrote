# Export

**Export book** (download icon in the top bar, or ⌘K → *Export book…*) compiles the manuscript into one file:

| Format | Needs | Notes |
|---|---|---|
| EPUB | Pandoc | EPUB 3, one file per chapter, table of contents, cover from `cover.jpg`/`cover.png` in the book folder; passes epubcheck |
| PDF | Pandoc + Typst | A5 book layout: title page, contents, chapters on new pages, page numbers, footnotes |
| Word (DOCX) | Pandoc | For editors, agents and publishers |
| HTML | Pandoc | One self-contained page (styles and images embedded) |
| Markdown | – | The compiled manuscript with a metadata header; always available |

Options: **whole book or selected chapters**, and **front matter** (title page and table of contents).

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
