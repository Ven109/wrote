<script setup lang="ts">
import type { TimelineGap, TimelineOverlap } from '#shared/utils/timeline-checks'

defineProps<{ overlaps: TimelineOverlap[], gaps: TimelineGap[], titleOf: (id: string) => string, formatDay: (day: number) => string }>()
</script>

<template>
  <section
    v-if="overlaps.length || gaps.length"
    aria-label="Timeline issues"
    class="flex flex-col gap-2"
  >
    <UAlert
      v-for="overlap in overlaps"
      :key="`${overlap.character}:${overlap.day}`"
      color="warning"
      variant="subtle"
      icon="i-lucide-split"
      :title="`${titleOf(overlap.character)} is in two places on ${formatDay(overlap.day)}`"
      :description="`${overlap.items.map(titleOf).join(' and ')} – at ${overlap.places.map(titleOf).join(' and ')}.`"
    />
    <UAlert
      v-for="gap in gaps"
      :key="`${gap.after}:${gap.before}`"
      color="neutral"
      variant="subtle"
      icon="i-lucide-move-horizontal"
      :title="`${gap.days} days pass between ${titleOf(gap.after)} and ${titleOf(gap.before)}`"
      description="Much longer than the book's usual pace – is the time skip clear to readers?"
    />
  </section>
</template>
