<script setup lang="ts">
defineEmits<{
  toggleSidebar: []
  toggleAssistant: []
}>()
</script>

<template>
  <header class="flex h-(--ui-header-height) shrink-0 items-center gap-2 border-b border-default px-3 sm:px-4">
    <UButton
      icon="i-lucide-panel-left"
      color="neutral"
      variant="ghost"
      aria-label="Toggle sidebar"
      class="size-11 justify-center lg:size-auto"
      @click="$emit('toggleSidebar')"
    />
    <div class="flex min-w-0 flex-1 items-center gap-2">
      <slot />
    </div>
    <UButton
      icon="i-lucide-sparkles"
      color="neutral"
      variant="ghost"
      aria-label="Toggle assistant"
      class="size-11 justify-center lg:size-auto"
      @click="$emit('toggleAssistant')"
    />
  </header>
</template>
