<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Beat } from '#shared/schemas/outline'

defineProps<{ beat: Beat, menu: DropdownMenuItem[][], dropBefore: boolean, dragging: boolean }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <li
    class="rounded-lg bg-default p-3 ring ring-default transition-opacity"
    :class="[dragging ? 'opacity-40' : '', dropBefore ? 'shadow-[0_-3px_0_var(--ui-primary)]' : '']"
    :aria-label="beat.title"
  >
    <div class="flex items-start gap-1">
      <button
        type="button"
        class="min-h-11 min-w-0 flex-1 text-start lg:min-h-0"
        @click="$emit('open')"
      >
        <span class="block font-medium text-highlighted">{{ beat.title }}</span>
        <span
          v-if="beat.summary"
          class="mt-1 line-clamp-3 block text-sm text-muted"
        >{{ beat.summary }}</span>
      </button>
      <BaseActionsMenu
        :items="menu"
        :label="beat.title"
      />
    </div>
    <UBadge
      v-if="!beat.scenes.length"
      label="Unwritten"
      color="warning"
      variant="subtle"
      size="sm"
      class="mt-2"
    />
  </li>
</template>
