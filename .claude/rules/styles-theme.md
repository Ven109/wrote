---
paths:
  - "**/*.css"
  - "app/app.config.ts"
---

# Styles & theme

- Theme lives in `app/app.config.ts` (`ui.colors.primary = 'yellow'`, `neutral = 'zinc'`, component defaults) and `app/assets/css/main.css` (`@import "tailwindcss"; @import "@nuxt/ui";`, `@theme` tokens, fonts).
- Use Nuxt UI semantic tokens/utilities (`text-default`, `text-muted`, `bg-elevated`, `border-default`, `text-primary`) – no raw hex/zinc/yellow values in components.
- Yellow (`primary`) is an accent only: primary actions, active nav, selection, AI suggestions, progress.
- Fonts: `--font-sans` Inter (UI), `--font-serif` Literata (manuscript). Self-hosted via `@nuxt/fonts`.
- Both color modes must be checked; dark is default.
- Prefer Tailwind utilities in templates; add CSS only for editor prose styles and things utilities cannot express.
