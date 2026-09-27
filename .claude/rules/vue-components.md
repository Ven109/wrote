---
paths:
  - "app/components/**/*.vue"
---

# Vue components

- `<script setup lang="ts">` only. Order: `<script>`, `<template>`, (rarely) `<style>`.
- **View only.** Components render state and emit events. Anything beyond trivial template glue (fetching, derived state, side effects, keyboard handling, timers, editor commands) lives in a composable (`app/composables/use*.ts`) that the component calls.
- Typed API: `defineProps<{…}>()` with defaults via destructuring, `defineEmits<{…}>()`, `defineModel()` for v-model. No untyped props.
- Never call `$fetch`/`useFetch` in a component; use a data composable (`useBook`, `useNotes`, …).
- **Nuxt UI first.** Build from `U*` components (`UButton`, `UCard`, `UForm`, `UModal`, `USidebar`, `UTree`, `UEditor`, `UChat*`, …) before writing custom markup. Customize through props / `ui` prop / `app.config.ts`, not by overriding internals.
- **Extract generic components** when markup repeats (2+ times) or a block is reusable across features. Put them in `app/components/base/` (auto-imported as `Base*`, e.g. `BaseEmptyState`, `BaseSectionHeader`, `BaseEntityCard`). Generic components know nothing about books/notes – they take props and slots.
- Feature components live in feature folders (`app/components/editor/`, `codex/`, `notes/`, `outline/`, `assistant/`, `app/` for the shell) and are auto-prefixed by folder (`EditorToolbar`, `CodexCard`).
- Prefer slots over boolean props for variations; max ~5 props per component before considering a split.
- Keep components ≤ ~150 lines. Split into subcomponents instead of long templates.
- No hardcoded colors or sizes: use theme tokens / Tailwind utilities (`text-muted`, `bg-elevated`, `text-primary`). AI-related UI uses the sparkles icon + primary tint.
- **Mobile-first & responsive:** base styles for phones, enhance with `sm:`/`md:`/`lg:`; no hover-only or drag-only interactions (always a tap alternative); touch targets ≥ 44px; use `UDrawer`/`USlideover` instead of popovers for complex menus on small screens (via a `useBreakpoint`-style composable, not duplicated markup).
- Accessibility: every icon-only button has `aria-label`; interactive elements are reachable by keyboard.
- Test behaviour (not markup) in a colocated `*.nuxt.test.ts` with `mountSuspended` when the component has interactions.
