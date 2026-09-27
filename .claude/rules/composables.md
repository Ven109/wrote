---
paths:
  - "app/composables/**"
---

# Composables

- One concern per composable: `useThing.ts` exports `useThing()`. Name by responsibility (`useAutosave`, `useWordCount`, `useSceneTree`), not by page.
- Return a plain object of refs/computed + functions (`{ items, isLoading, create, remove }`). No reactive() wrappers around the return value.
- **Compose, don't grow:** build larger composables from smaller ones (`useScene` uses `useEntry` + `useAutosave`). Split when > ~200 lines.
- Accept `MaybeRefOrGetter` inputs and normalize with `toValue()`; watch reactively.
- **Server data = Pinia Colada.** Data composables (`useBooks`, `useBook`, `useManuscript`, …) wrap `useQuery`/`useMutation` from `@pinia/colada`; do not use `useFetch`/`useAsyncData` for app data.
  - Query keys come only from the factory in `app/queries/keys.ts` (hierarchical: `['book', id, 'structure']`); query options live in `app/queries/*.ts` (`defineQueryOptions`).
  - Mutations invalidate or update the affected keys (`onSettled` → `invalidateQueries`, `onSuccess` → `setQueryData`). Use optimistic updates with rollback (`onMutate` returns context, `onError` restores) for interactions that must feel instant (reorder, rename, delete, autosave).
  - Live updates: `useBookSync` invalidates `['book', id]` on SSE events – don't add per-component refresh logic.
- **Client state = Pinia** (`app/stores/`, setup stores) for state shared across components that is not server data (command palette, editor session, assistant UI). Local state stays in the composable/component. Never keep mutable state in module scope (it leaks between SSR requests).
- Components never import `@pinia/colada` or stores directly – they use the composables.
- SSR-safe: no `window`/`document` at top level; guard with `import.meta.client` or `onMounted`. Clean up listeners/timers (`onScopeDispose`, VueUse helpers).
- Prefer VueUse utilities over hand-rolled ones.
- Pure helpers used by a composable go to `app/utils/` or `shared/utils/` so they can be unit-tested without Nuxt.
- Every composable has a colocated `*.nuxt.test.ts` (or `*.test.ts` if Nuxt-free).
