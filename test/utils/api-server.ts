import { setup } from '@nuxt/test-utils/e2e'
import { API_OUTPUT_DIR } from '../setup/api-build'

/** Below Linux' ephemeral range (32768+), so outgoing connections and `listen(0)` never take these ports. */
const BASE_PORT = 21_000
const PORTS_PER_WORKER = 200

/**
 * Starts the app for an API test file from the shared build (`test/setup/api-build.ts`) with the file's own
 * workspace. Ports are derived from the vitest worker (unique among files running at the same time) and the
 * file, so concurrently booting servers never race for a port.
 */
export function setupApiServer(workspaceDir: string, file: string, options: { env?: Record<string, string> } = {}) {
  const worker = Number(process.env.VITEST_POOL_ID ?? 1)
  const offset = [...file].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % PORTS_PER_WORKER
  return setup({
    build: false,
    server: true,
    port: BASE_PORT + worker * PORTS_PER_WORKER + offset,
    nuxtConfig: { nitro: { output: { dir: API_OUTPUT_DIR } } },
    env: { NUXT_WORKSPACE_DIR: workspaceDir, ...options.env },
  })
}
