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
  },

  build: {
    // Bundle Pinia and Pinia Colada into the server build so they share the app's Vue instance; externalized they
    // load a second Vue copy, lose the app's injection context and fall back to a global Pinia (PINIA_R1004).
    transpile: ['pinia', '@pinia/colada', '@pinia/colada-nuxt'],
  },

  compatibilityDate: '2026-09-01',

  vite: {
    build: {
      // The editor bundle is large by nature; keep build output to real warnings.
      chunkSizeWarningLimit: 3000,
      rolldownOptions: { checks: { pluginTimings: false } },
    },
  },

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
