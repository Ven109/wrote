import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: { '#shared': fileURLToPath(new URL('./shared', import.meta.url)) },
        },
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['test/setup/cleanup.ts'],
          include: ['{app,server,shared,test,cli}/**/*.test.ts'],
          exclude: ['**/*.nuxt.test.ts', '**/node_modules/**', 'test/e2e/**', 'test/api/**'],
        },
      },
      {
        test: {
          name: 'api',
          environment: 'node',
          // The app is built once for all API test files (each file starts its own server from it).
          globalSetup: ['test/setup/api-build.ts'],
          setupFiles: ['test/setup/cleanup.ts'],
          include: ['test/api/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          include: ['{app,test}/**/*.nuxt.test.ts'],
          // Booting Nuxt can exceed the 10s default on a cold dependency cache.
          hookTimeout: 60_000,
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
