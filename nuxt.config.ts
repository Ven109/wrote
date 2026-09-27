export default defineNuxtConfig({
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
