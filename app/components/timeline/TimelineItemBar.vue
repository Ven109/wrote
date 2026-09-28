<script setup lang="ts">
import type { TimelineItem } from '#shared/schemas/timeline'

defineProps<{ item: TimelineItem, left: number, width: number, offset: number, flagged: boolean, dragging: boolean }>()
defineEmits<{
  pointerdown: [event: PointerEvent]
  pointermove: [event: PointerEvent]
  pointerup: [event: PointerEvent]
  pointercancel: []
  open: []
  shift: [days: number]
}>()
</script>

<template>
  <button
    type="button"
    class="absolute top-1 flex h-11 touch-none items-center gap-1 overflow-hidden rounded-md border px-2 text-left text-xs select-none focus-visible:outline-2 focus-visible:outline-primary"
    :class="[
      item.kind === 'event' ? 'border-primary/50 bg-primary/10' : 'border-default bg-elevated',
      flagged && 'ring-2 ring-warning',
      dragging ? 'z-10 cursor-grabbing shadow-lg' : 'cursor-grab',
    ]"
    :style="{ left: `${left}px`, width: `${width}px`, transform: `translateX(${offset}px)` }"
    :title="`${item.title} – ${item.date}`"
    :aria-label="`${item.title}, ${item.date}. Arrow keys move it a day, Enter opens it.`"
    :data-timeline-item="item.id"
    @pointerdown="$emit('pointerdown', $event)"
    @pointermove="$emit('pointermove', $event)"
    @pointerup="$emit('pointerup', $event)"
    @pointercancel="$emit('pointercancel')"
    @click="$emit('open')"
    @keydown.left.prevent="$emit('shift', -1)"
    @keydown.right.prevent="$emit('shift', 1)"
  >
    <UIcon
      :name="item.kind === 'event' ? 'i-lucide-calendar' : 'i-lucide-file-text'"
      class="size-3.5 shrink-0 text-muted"
    />
    <span class="truncate">{{ item.title }}</span>
  </button>
</template>
