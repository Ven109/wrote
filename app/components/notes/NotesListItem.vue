<script setup lang="ts">
import type { NoteSummary } from '#shared/schemas/notes'

defineProps<{ note: NoteSummary, to: string, active?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex min-h-11 flex-col gap-1 rounded-md px-3 py-2 transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
    :class="active ? 'bg-elevated' : ''"
    :aria-current="active ? 'page' : undefined"
  >
    <span class="flex items-center gap-1.5">
      <UIcon
        v-if="note.pinned"
        name="i-lucide-pin"
        class="size-3.5 shrink-0 text-primary"
        aria-label="Pinned"
      />
      <UIcon
        v-else-if="note.inbox"
        name="i-lucide-inbox"
        class="size-3.5 shrink-0 text-muted"
        aria-label="In inbox"
      />
      <span class="truncate text-sm font-medium text-highlighted">{{ note.title }}</span>
    </span>
    <span
      v-if="note.excerpt"
      class="line-clamp-2 text-xs text-muted"
    >{{ note.excerpt }}</span>
    <span
      v-if="note.tags.length"
      class="flex flex-wrap gap-1"
    >
      <UBadge
        v-for="tag in note.tags"
        :key="tag"
        :label="tag"
        color="neutral"
        variant="subtle"
        size="sm"
      />
    </span>
  </NuxtLink>
</template>
