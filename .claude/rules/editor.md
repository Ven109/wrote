---
paths:
  - "app/editor/**"
  - "app/components/editor/**"
---

# Editor (UEditor / TipTap)

- The editor is `UEditor` wrapped in `WroteEditor`; configuration (extensions, menus) is composed in `useWroteEditor()`.
- **One extension per file** in `app/editor/extensions/` (`scene-break.ts`, `wiki-link.ts`, `ai-suggestion.ts`, …). Each exports a factory and its Markdown (de)serialization.
- Node views are Vue components in `app/components/editor/nodes/`; they stay view-only and receive node attrs as props.
- Slash-menu, mention and toolbar items are data (arrays of item configs) registered via small registries, so features can add items without editing the editor core.
- **Markdown round-trip is a contract:** every node/mark has golden-file tests (`*.test.ts`) proving Markdown → doc → Markdown is lossless. Custom blocks serialize as directives (`:::note … :::`).
- Working blocks (notes, suggestions, codex cards) must declare whether they are exported.
- AI output never writes directly into the doc: it creates `ai-suggestion` marks/nodes that the user accepts or rejects.
- Performance: decorations (mention detection, highlights) are incremental; no full-doc scans per keystroke.
