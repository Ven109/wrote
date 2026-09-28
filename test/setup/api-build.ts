import { execFile } from 'node:child_process'
import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

/** Where the API tests' shared build lives (one build per test run instead of one per test file). */
export const API_BUILD_DIR = resolve('.nuxt', 'test', 'api')
export const API_OUTPUT_DIR = resolve(API_BUILD_DIR, 'output')

/**
 * Global setup of the `api` project: builds the app once (in a child process – Nuxt's build takes over the
 * process it runs in). Every API test file then starts its own server from this build with its own workspace,
 * which takes about a second instead of a full build per file.
 */
export async function setup() {
  await rm(API_BUILD_DIR, { recursive: true, force: true })
  await run('pnpm', ['exec', 'nuxi', 'build'], {
    env: { ...process.env, WROTE_TEST_BUILD_DIR: API_BUILD_DIR, NODE_ENV: 'production' },
    maxBuffer: 64 * 1024 * 1024,
    timeout: 600_000,
  })
}

export async function teardown() {
  await rm(API_BUILD_DIR, { recursive: true, force: true })
}
