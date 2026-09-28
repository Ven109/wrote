<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

/** An "…" button opening a menu of actions for one item (labelled for screen readers). */
defineProps<{ items: DropdownMenuItem[][], label: string }>()
</script>

<template>
  <UDropdownMenu
    :items="items"
    :content="{ align: 'end' }"
  >
    <UButton
      icon="i-lucide-ellipsis"
      color="neutral"
      variant="ghost"
      size="xs"
      :aria-label="`Actions for ${label}`"
      class="size-11 shrink-0 justify-center lg:size-7"
      @click.stop
    />
  </UDropdownMenu>
</template>
