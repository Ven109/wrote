<script setup lang="ts">
const { sidebarOpen, assistantOpen, toggleSidebar, toggleAssistant } = useAppLayout()
useAppCommands()
useBookSync(useAppNavigation().bookId)
</script>

<template>
  <div class="flex min-h-svh bg-muted">
    <AppSidebar v-model:open="sidebarOpen" />

    <AppMain class="lg:me-2">
      <AppTopbar
        @toggle-sidebar="toggleSidebar"
        @toggle-assistant="toggleAssistant"
      >
        <slot name="title" />
      </AppTopbar>
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </AppMain>

    <AppAssistantSidebar v-model:open="assistantOpen" />
    <AppCommandPalette />
  </div>
</template>
