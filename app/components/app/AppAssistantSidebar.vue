<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const { configured } = useAiStatus()
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
      :description="configured ? 'Ask questions about your book, brainstorm or get feedback.' : 'Connect an AI provider – a cloud API key or a local model with Ollama – to start.'"
    >
      <UButton
        v-if="!configured"
        to="/settings/ai"
        label="Set up AI"
        icon="i-lucide-settings-2"
        class="min-h-11 sm:min-h-0"
      />
    </BaseEmptyState>
  </USidebar>
</template>
