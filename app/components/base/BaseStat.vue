<script setup lang="ts">
defineProps<{
  icon: string
  label: string
}>()
</script>

<template>
  <span class="inline-flex items-center gap-1 text-xs text-muted">
    <UIcon
      :name="icon"
      class="size-3.5"
      aria-hidden="true"
    />
    <span>{{ label }}</span>
  </span>
</template>
