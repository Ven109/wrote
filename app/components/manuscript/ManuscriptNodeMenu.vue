<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  items: DropdownMenuItem[][]
  label: string
}>()
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
      class="size-8 justify-center opacity-100 lg:size-6 lg:opacity-0 lg:group-hover/node:opacity-100 lg:focus-visible:opacity-100 lg:data-[state=open]:opacity-100"
      @click.stop
    />
  </UDropdownMenu>
</template>
