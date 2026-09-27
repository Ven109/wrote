export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxt/test-utils/module'],

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  ui: {
    // Fonts are self-hosted (see theme); never fetch from remote providers.
    fonts: false,
  },

  compatibilityDate: '2026-09-01',

  typescript: {
    strict: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },
})
