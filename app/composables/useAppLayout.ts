/** Open/collapsed state of the app shell's sidebars, persisted in cookies (SSR-safe). */
export function useAppLayout() {
  const sidebarOpen = useCookie<boolean>('wrote-sidebar-open', { default: () => true })
  const assistantOpen = useCookie<boolean>('wrote-assistant-open', { default: () => false })

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  function toggleAssistant() {
    assistantOpen.value = !assistantOpen.value
  }

  return { sidebarOpen, assistantOpen, toggleSidebar, toggleAssistant }
}
