<script setup lang="ts">
import type { TimelineView } from '#shared/schemas/timeline'

defineProps<{ items: TimelineView['undated'], linkTo: (item: TimelineView['undated'][number]) => string }>()
</script>

<template>
  <section
    v-if="items.length"
    aria-labelledby="timeline-undated"
    class="flex flex-col gap-2"
  >
    <h2
      id="timeline-undated"
      class="text-sm font-medium"
    >
      Not on the timeline ({{ items.length }})
    </h2>
    <p class="text-xs text-muted">
      Give scenes a “Timeline” date (e.g. Day 3, 1890-05-12 or a date in your calendar) and events a date to place them.
    </p>
    <ul class="flex flex-wrap gap-2">
      <li
        v-for="item in items"
        :key="item.id"
      >
        <UButton
          :to="linkTo(item)"
          color="neutral"
          variant="outline"
          size="sm"
          :icon="item.kind === 'event' ? 'i-lucide-calendar' : 'i-lucide-file-text'"
          :label="item.date ? `${item.title} (“${item.date}” not readable)` : item.title"
        />
      </li>
    </ul>
  </section>
</template>
