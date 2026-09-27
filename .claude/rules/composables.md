---
paths:
  - "app/composables/**"
---

# Composables

- One concern per composable: `useThing.ts` exports `useThing()`. Name by responsibility (`useAutosave`, `useWordCount`, `useSceneTree`), not by page.
- Return a plain object of refs/computed + functions (`{ items, isLoading, create, remove }`). No reactive() wrappers around the return value.
- **Compose, don't grow:** build larger composables from smaller ones (`useScene` uses `useEntry` + `useAutosave`). Split when > ~200 lines.
- Accept `MaybeRefOrGetter` inputs and normalize with `toValue()`; watch reactively.
- Data access goes through composables wrapping `useFetch`/`$fetch` with typed responses (types from `shared/`). Unique, stable keys for `useFetch`/`useAsyncData`.
- Shared state: `useState` (SSR-safe) or a module-level singleton only when truly global; document why.
- SSR-safe: no `window`/`document` at top level; guard with `import.meta.client` or `onMounted`. Clean up listeners/timers (`onScopeDispose`, VueUse helpers).
- Prefer VueUse utilities over hand-rolled ones.
- Pure helpers used by a composable go to `app/utils/` or `shared/utils/` so they can be unit-tested without Nuxt.
- Every composable has a colocated `*.nuxt.test.ts` (or `*.test.ts` if Nuxt-free).
