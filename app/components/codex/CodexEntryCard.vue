<script setup lang="ts">
import type { CodexEntrySummary } from '#shared/schemas/codex'

defineProps<{ entry: CodexEntrySummary, to: string, icon: string, typeLabel: string, active?: boolean, grid?: boolean }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="flex min-h-11 gap-3 rounded-md px-3 py-2 transition-colors hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
    :class="[active ? 'bg-elevated' : '', grid ? 'flex-col border border-default p-3' : 'items-start']"
    :aria-current="active ? 'page' : undefined"
  >
    <UIcon
      :name="icon"
      class="mt-0.5 size-4 shrink-0 text-muted"
      :aria-label="typeLabel"
    />
    <span class="flex min-w-0 flex-col gap-0.5">
      <span class="truncate text-sm font-medium text-highlighted">{{ entry.title }}</span>
      <span
        v-if="entry.aliases.length"
        class="truncate text-xs text-muted"
      >{{ entry.aliases.join(' · ') }}</span>
      <span
        v-if="entry.excerpt"
        class="text-xs text-dimmed"
        :class="grid ? 'line-clamp-3' : 'line-clamp-1'"
      >{{ entry.excerpt }}</span>
    </span>
  </NuxtLink>
</template>
