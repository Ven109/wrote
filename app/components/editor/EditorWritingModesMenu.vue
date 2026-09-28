<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/** "Writing modes" button for the page header: the same toggles as ⌘K, reachable by tap. */
defineProps<{ items: DropdownMenuItem[] }>()
</script>

<template>
  <UDropdownMenu :items="items">
    <UButton
      icon="i-lucide-pen-line"
      color="neutral"
      variant="ghost"
      aria-label="Writing modes"
      class="size-11 justify-center lg:size-auto"
    />
  </UDropdownMenu>
</template>
