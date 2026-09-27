<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div class="min-w-0">
      <h1 class="truncate text-2xl font-semibold text-highlighted">
        {{ title }}
      </h1>
      <p
        v-if="description"
        class="text-muted"
      >
        {{ description }}
      </p>
    </div>
    <div
      v-if="$slots.actions"
      class="flex flex-wrap gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
