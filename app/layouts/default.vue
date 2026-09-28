<script setup lang="ts">
const { sidebarOpen, assistantOpen, toggleSidebar, toggleAssistant } = useAppLayout()
const { isMobile } = useBreakpoint()
const route = useRoute()

// On phones the sidebar is a slideover: close it once the user navigated somewhere.
watch(() => route.fullPath, () => {
  if (isMobile.value) sidebarOpen.value = false
})
useAppCommands()
const { bookId } = useAppNavigation()
useBookSync(bookId)
const exportDialog = useExportDialog()
// Distraction-free mode hides the shell without touching its state, so leaving it restores the layout as it was.
const { distractionFree } = useWritingModes()
</script>

<template>
  <div class="flex min-h-svh bg-muted">
    <AppSidebar
      v-if="!distractionFree"
      v-model:open="sidebarOpen"
    />

    <AppMain :bare="distractionFree">
      <AppTopbar
        v-if="!distractionFree"
        @toggle-sidebar="toggleSidebar"
        @toggle-assistant="toggleAssistant"
      >
        <slot name="title" />
        <template #actions>
          <UButton
            v-if="bookId"
            icon="i-lucide-download"
            color="neutral"
            variant="ghost"
            aria-label="Export book"
            class="min-h-11 justify-center lg:min-h-0"
            @click="exportDialog.show"
          />
          <AppJobsIndicator
            v-if="bookId"
            :book-id="bookId"
          />
        </template>
      </AppTopbar>
      <div class="flex-1 overflow-y-auto">
        <slot />
      </div>
    </AppMain>

    <AppAssistantSidebar
      v-if="!distractionFree"
      v-model:open="assistantOpen"
    />
    <AppCommandPalette />
    <NotesQuickCapture />
    <AppApprovals
      v-if="bookId"
      :book-id="bookId"
    />
    <ExportModal
      v-if="bookId"
      :book-id="bookId"
    />
  </div>
</template>
