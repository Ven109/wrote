<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
</script>

<template>
  <USidebar
    v-model:open="open"
    side="right"
    variant="inset"
    collapsible="offcanvas"
    title="Assistant"
    close
    :ui="{ root: '[--sidebar-width:22rem]' }"
  >
    <template #title>
      <span class="flex items-center gap-2">
        <UIcon
          name="i-lucide-sparkles"
          class="size-4 text-primary"
        />
        Assistant
      </span>
    </template>
    <BaseEmptyState
      icon="i-lucide-sparkles"
      title="Your writing assistant"
      description="Ask questions about your book, brainstorm or get feedback. Connect an AI provider in settings to start."
    />
  </USidebar>
</template>
