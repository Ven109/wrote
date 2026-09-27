import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig, devices } from '@playwright/test'

const PORT = Number(process.env.E2E_PORT ?? 3100)
// Optional: use a preinstalled Chromium (e.g. in sandboxes) instead of Playwright's download.
const executablePath = process.env.PW_CHROMIUM_PATH || undefined
// Every run gets a fresh, empty workspace.
const workspaceDir = process.env.E2E_WORKSPACE_DIR ?? mkdtempSync(join(tmpdir(), 'wrote-e2e-'))

export default defineConfig({
  testDir: 'test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: `pnpm build && PORT=${PORT} node .output/server/index.mjs`,
    url: `http://localhost:${PORT}`,
    env: { NUXT_WORKSPACE_DIR: workspaceDir, WROTE_TEST_JOBS: '1' },
    reuseExistingServer: false,
    timeout: 240_000,
  },
})
