<script setup lang="ts">
defineProps<{ collapsed?: boolean }>()
</script>

<template>
  <NuxtLink
    to="/"
    class="flex items-center gap-2 font-semibold text-highlighted"
    aria-label="Wrote – library"
  >
    <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-inverted">
      <UIcon
        name="i-lucide-feather"
        class="size-4"
      />
    </span>
    <span
      v-if="!collapsed"
      class="truncate"
    >Wrote</span>
  </NuxtLink>
</template>
