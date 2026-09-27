---
paths:
  - "app/editor/**"
  - "app/components/editor/**"
---

# Editor (UEditor / TipTap)

- The editor is `UEditor` wrapped in `editor/WroteEditor.vue` (`<EditorWroteEditor>`); extensions come from `app/editor/extensions/index.ts` (`wroteExtensions()`), menu items are data in `app/editor/menus.ts`, block actions in `app/editor/block-actions.ts` (shared by both modes).
- **One extension per file** in `app/editor/extensions/` (`scene-break.ts`, `wiki-link.ts`, `ai-suggestion.ts`, …). Each exports a factory and its Markdown (de)serialization.
- Node views are Vue components in `app/components/editor/nodes/`; they stay view-only and receive node attrs as props.
- Slash-menu, mention and toolbar items are data (arrays of item configs) registered via small registries, so features can add items without editing the editor core.
- **Markdown round-trip is a contract:** every node/mark has golden-file tests (`*.test.ts`) proving Markdown → doc → Markdown is lossless. Custom blocks serialize as directives (`:::note … :::`).
- Working blocks (notes, suggestions, codex cards) must declare whether they are exported.
- AI output never writes directly into the doc: suggestions are shown as decorations (`extensions/ai-suggestions.ts` – struck original, highlighted proposal, block proposals as widgets; never in the Markdown). Accepting applies the text as a normal, undoable editor change (`suggestion-apply.ts`).
- **Two modes, one document.** `useEditorMode()` returns `'block' | 'document'` (block on `lg+` with fine pointer, document on mobile/touch; user-overridable). Mode only changes chrome, never the document or Markdown.
  - *Block mode* (desktop): `UEditorDragHandle` + block menu, bubble `UEditorToolbar`, keyboard block moves.
  - *Document mode* (mobile/touch): **no drag handle / gutter**; sticky bottom toolbar above the keyboard (formatting, `+` insert, `⋯` block actions, ✦ AI); block actions (turn into, move up/down, duplicate, delete, AI) in a `UDrawer` action sheet for the block at the cursor.
  - Every block action must be reachable in both modes (drag-only features are not allowed).
- Performance: decorations (mention detection, highlights) are incremental; no full-doc scans per keystroke.
