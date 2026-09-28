<script setup lang="ts">
import type { UsageGroup } from '#shared/schemas/usage'
import { formatCost, formatTokens } from '~/utils/usage'

defineProps<{ title: string, groups: (UsageGroup & { share: number })[] }>()
</script>

<template>
  <section
    class="flex flex-col gap-2 rounded-lg border border-default p-4"
    :aria-label="title"
  >
    <h2 class="text-sm font-semibold text-highlighted">
      {{ title }}
    </h2>
    <p
      v-if="!groups.length"
      class="text-sm text-muted"
    >
      No AI calls in this period.
    </p>
    <ul
      v-else
      class="flex flex-col gap-2"
    >
      <li
        v-for="group in groups"
        :key="group.key"
        class="flex flex-col gap-1"
      >
        <div class="flex items-baseline justify-between gap-2 text-sm">
          <span class="truncate">{{ group.label }}</span>
          <span class="shrink-0 text-muted tabular-nums">
            {{ formatTokens(group.inputTokens + group.outputTokens) }} tokens · {{ formatCost(group.cost) }}
          </span>
        </div>
        <div
          class="h-1.5 rounded-full bg-elevated"
          aria-hidden="true"
        >
          <div
            class="h-full rounded-full bg-primary"
            :style="{ width: `${group.share}%` }"
          />
        </div>
      </li>
    </ul>
  </section>
</template>
