---
paths:
  - "**/*.test.ts"
  - "**/*.spec.ts"
  - "test/**"
---

# Tests

- **Vitest** projects: `unit` (node env, `*.test.ts`) and `nuxt` (`@nuxt/test-utils` env, `*.nuxt.test.ts`). **Playwright** for e2e in `test/e2e/*.spec.ts`.
- Colocate unit/nuxt tests next to the file under test. Name tests by behaviour: `it('moves a scene to another chapter and renumbers siblings')`.
- Arrange–act–assert; one behaviour per test; no logic (loops/conditionals) in tests beyond table-driven `it.each`.
- Use the fixture book `test/fixtures/sample-book/`, copied to a temp dir per test for anything that writes. Never write to the real fixture.
- Mock at boundaries only (AI providers, network, clock). Never call real LLM providers in CI; use AI SDK mock models.
- Components: test interactions and emitted events with `mountSuspended`, not markup snapshots. Composables: test returned state and functions.
- Editor: golden-file Markdown round-trip tests for every node/mark.
- e2e covers the core flows: create book, write scene (autosave), quick capture, accept AI suggestion (mocked), MCP create_note appears live, export.
- e2e runs on a desktop and a mobile viewport project (e.g. Playwright `Desktop Chrome` + `Pixel 7`); editor tests cover both block mode and document mode.
- A bug fix starts with a failing test that reproduces it.
