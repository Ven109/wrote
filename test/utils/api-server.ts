import { setup } from '@nuxt/test-utils/e2e'

/** Below Linux' ephemeral range (32768+), so outgoing connections and `listen(0)` never take these ports. */
const BASE_PORT = 21_000
const PORTS_PER_WORKER = 200

/**
 * Starts the built app for an API test file. Ports are derived from the vitest worker (unique among
 * files running at the same time) and the file, instead of random ones that raced when several API
 * files booted at once (EADDRINUSE). The file part keeps consecutive files of one worker apart while
 * the previous server shuts down.
 */
export function setupApiServer(workspaceDir: string, file: string) {
  const worker = Number(process.env.VITEST_POOL_ID ?? 1)
  const offset = [...file].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7) % PORTS_PER_WORKER
  return setup({ server: true, port: BASE_PORT + worker * PORTS_PER_WORKER + offset, nuxtConfig: { runtimeConfig: { workspaceDir } } })
}
