import pkg from './package.json'

// API tests build the app once into a shared folder (see test/setup/api-build.ts).
const testBuildDir = process.env.WROTE_TEST_BUILD_DIR

export default defineNuxtConfig({
  ...(testBuildDir ? { buildDir: testBuildDir, nitro: { output: { dir: `${testBuildDir}/output` } } } : {}),

  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils/module', '@pinia/nuxt', '@pinia/colada-nuxt'],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark',
  },

  ui: {
    // Fonts are self-hosted via @fontsource (see main.css); never fetch from remote providers.
    fonts: false,
  },

  runtimeConfig: {
    // Folder containing the user's books (override with NUXT_WORKSPACE_DIR).
    workspaceDir: '',
    // Reported by /api/health (Docker image and npm package are released with matching versions).
    appVersion: pkg.version,
  },

  compatibilityDate: '2026-09-01',

  typescript: {
    strict: true,
    tsConfig: {
      // Unknown components/props in templates are type errors (catches wrong auto-import names).
      vueCompilerOptions: { checkUnknownComponents: true },
    },
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
