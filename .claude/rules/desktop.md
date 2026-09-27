---
paths:
  - "desktop/**"
---

# Desktop (Electron)

- `desktop/` contains only the Electron shell: `main/` (main process: window, menus, starting the Nitro server, file dialogs, recording), `preload/` (minimal typed bridge), `build/` (electron-builder config, entitlements).
- The UI is the same Nuxt app; no desktop-only Vue code except behind a `useDesktop()` composable that feature-detects the preload bridge.
- Security: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, strict CSP, no remote content, validate every IPC message with Zod.
- IPC channels are typed and defined once in `desktop/shared/ipc.ts`.
- Recording streams audio to disk in chunks (crash-safe); request OS permissions explicitly and handle denial.
- Main-process logic is unit-tested with Vitest; the packaged app gets a Playwright Electron smoke test.
