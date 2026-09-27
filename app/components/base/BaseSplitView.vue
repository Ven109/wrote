<script setup lang="ts">
/** List + detail layout: side by side on desktop; on phones the detail replaces the list when active. */
defineProps<{ detailActive: boolean, listLabel: string }>()
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside
      class="w-full flex-col overflow-y-auto p-4 lg:flex lg:w-80 lg:shrink-0 lg:border-e lg:border-default"
      :class="detailActive ? 'hidden' : 'flex'"
      :aria-label="listLabel"
    >
      <slot name="list" />
    </aside>
    <div
      class="min-w-0 flex-1 overflow-y-auto lg:block"
      :class="detailActive ? 'block' : 'hidden'"
    >
      <slot />
    </div>
  </div>
</template>
