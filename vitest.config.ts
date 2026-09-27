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
          include: ['{app,server,shared,test}/**/*.test.ts'],
          exclude: ['**/*.nuxt.test.ts', '**/node_modules/**', 'test/e2e/**', 'test/api/**'],
        },
      },
      {
        test: {
          name: 'api',
          environment: 'node',
          include: ['test/api/**/*.test.ts'],
          testTimeout: 30_000,
          hookTimeout: 240_000,
        },
      },
      await defineVitestProject({
        test: {
          name: 'nuxt',
          environment: 'nuxt',
          include: ['{app,test}/**/*.nuxt.test.ts'],
          environmentOptions: {
            nuxt: { domEnvironment: 'happy-dom' },
          },
        },
      }),
    ],
  },
})
