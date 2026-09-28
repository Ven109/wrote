// API tests build the app once into a shared folder (see test/setup/api-build.ts).
const testBuildDir = process.env.WROTE_TEST_BUILD_DIR

// Server bundle warnings that are not actionable: dependencies (zod, Nuxt's own output) place pure annotations where
// Rollup cannot read them. Nitro's own ignores are kept.
const IGNORED_SERVER_WARNINGS = new Set(['CIRCULAR_DEPENDENCY', 'EVAL', 'INVALID_ANNOTATION'])

export default defineNuxtConfig({
  ...(testBuildDir ? { buildDir: testBuildDir } : {}),

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

  nitro: {
    ...(testBuildDir ? { output: { dir: `${testBuildDir}/output` } } : {}),
    rollupConfig: {
      onwarn(warning, warn) {
        if (IGNORED_SERVER_WARNINGS.has(warning.code ?? '') || warning.message.includes('Unsupported source map comment')) return
        warn(warning)
      },
    },
  },

  vite: {
    // Pre-bundle client dependencies up front. Discovered lazily, Vite optimizes them in several batches and reloads the
    // page each time; for the editor stack that loads two copies of ProseMirror and the editor fails to start
    // ("Adding different instances of a keyed plugin").
    optimizeDeps: {
      include: [
        '@vueuse/core',
        'zod',
        'ai',
        '@ai-sdk/vue',
        'dompurify',
        'marked',
        '@tiptap/core',
        '@tiptap/vue-3',
        '@tiptap/vue-3/menus',
        '@tiptap/pm/model',
        '@tiptap/pm/state',
        '@tiptap/pm/view',
        '@tiptap/starter-kit',
        '@tiptap/markdown',
        '@tiptap/extension-image',
        '@nuxt/ui > @tiptap/extension-bubble-menu',
        '@nuxt/ui > @tiptap/extension-code',
        '@nuxt/ui > @tiptap/extension-drag-handle-vue-3',
        '@nuxt/ui > @tiptap/extension-floating-menu',
        '@nuxt/ui > @tiptap/extension-horizontal-rule',
        '@nuxt/ui > @tiptap/extension-mention',
        '@nuxt/ui > @tiptap/extension-placeholder',
        '@nuxt/ui > @tiptap/suggestion',
      ],
    },
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
