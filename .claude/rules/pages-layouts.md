---
paths:
  - "app/pages/**"
  - "app/layouts/**"
  - "app/app.vue"
---

# Pages & layouts

- Pages are **thin**: read route params, call composables, compose feature components. No business logic, no direct `$fetch`.
- Use `definePageMeta` for layout/middleware and `useSeoMeta` for titles.
- **Layout = `USidebar` app shell.** Never use `UDashboardGroup`/`UDashboardSidebar`/`UDashboardPanel`.
  - Left: `USidebar variant="inset" collapsible="icon" rail` with header (book switcher), body (navigation, manuscript tree), footer (user, color mode).
  - Main: page content in an inset, rounded container next to the sidebar.
  - Right: `USidebar side="right"` for the assistant (offcanvas, toggle shortcut).
  - Open/collapsed state comes from `useAppLayout()`; shell pieces are components in `app/components/app/` (`AppSidebar`, `AppSidebarNav`, `AppMain`, `AppAssistantSidebar`).
- Handle loading, empty and error states on every page (use `Base*` components for them).
- Pages must work from 360px width: sidebars become slideovers, no horizontal scroll, sticky actions reachable with the thumb. Check every page at phone, tablet and desktop widths.
