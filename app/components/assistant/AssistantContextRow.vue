<script setup lang="ts">
import type { ContextRow } from '~/utils/context-items'

defineProps<{ row: ContextRow }>()
defineEmits<{ pin: [], remove: [] }>()
const format = useFormat()
</script>

<template>
  <li
    class="flex flex-col gap-1 rounded-md border border-default p-2"
    :class="{ 'opacity-60': row.removed || (!row.sent && !row.pinned) }"
  >
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-medium text-highlighted">
          {{ row.item.title }}
        </p>
        <p class="text-xs text-muted">
          {{ format.number(row.item.tokens) }} tokens
          <template v-if="'reason' in row.item">
            · {{ row.item.reason === 'budget' ? 'left out: over the budget' : 'left out by you' }}
          </template>
          <template v-else-if="row.item.pinned">
            · pinned
          </template>
        </p>
      </div>
      <UButton
        :icon="row.pinned ? 'i-lucide-pin-off' : 'i-lucide-pin'"
        :aria-label="row.pinned ? `Unpin ${row.item.title}` : `Pin ${row.item.title}`"
        :aria-pressed="row.pinned"
        color="neutral"
        :variant="row.pinned ? 'soft' : 'ghost'"
        class="size-11 justify-center"
        @click="$emit('pin')"
      />
      <UButton
        v-if="row.sent || row.removed"
        :icon="row.removed ? 'i-lucide-undo-2' : 'i-lucide-x'"
        :aria-label="row.removed ? `Include ${row.item.title} again` : `Leave out ${row.item.title}`"
        :aria-pressed="row.removed"
        color="neutral"
        :variant="row.removed ? 'soft' : 'ghost'"
        class="size-11 justify-center"
        @click="$emit('remove')"
      />
    </div>
    <p
      v-if="'text' in row.item"
      class="line-clamp-3 text-xs whitespace-pre-line text-muted"
    >
      {{ row.item.text }}
    </p>
  </li>
</template>
