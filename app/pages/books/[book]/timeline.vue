<script setup lang="ts">
import type { TimelineItem, TimelineView } from '#shared/schemas/timeline'
import { formatAxisDay } from '~/utils/timeline-layout'

const bookId = useRouteBookId()
const timeline = useTimeline(bookId)
const { view, isPending, error, lanes, ticks, range, perDay, width, overlaps, gaps, flagged, titleOf } = timeline
const formatDay = (day: number) => formatAxisDay(view.value, day)
const linkTo = (item: Pick<TimelineItem, 'kind' | 'path'>) => `/books/${bookId.value}/${item.kind === 'event' ? 'codex' : 'write'}/${item.path}`
const open = (item: TimelineItem | TimelineView['undated'][number]) => navigateTo(linkTo(item))
useSeoMeta({ title: 'Timeline' })
</script>

<template>
  <div class="flex w-full flex-col gap-4 p-4 sm:p-6">
    <BasePageHeader
      title="Timeline"
      description="Scenes and events in story order. Drag an item – or focus it and use the arrow keys – to change its date."
    />
    <TimelineToolbar
      v-model:character="timeline.character.value"
      v-model:place="timeline.place.value"
      v-model:lane-mode="timeline.laneMode.value"
      :people="view.people"
      :locations="view.locations"
      :can-zoom-in="timeline.canZoomIn.value"
      :can-zoom-out="timeline.canZoomOut.value"
      @zoom-in="timeline.zoomIn"
      @zoom-out="timeline.zoomOut"
    />
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Could not load the timeline"
      :description="apiErrorMessage(error)"
    />
    <p
      v-else-if="isPending"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <template v-else>
      <BaseEmptyState
        v-if="!lanes.length"
        icon="i-lucide-calendar-range"
        title="Nothing on the timeline yet"
        description="Give scenes a “Timeline” date or add Event entries to the codex."
      />
      <TimelineCanvas
        v-else
        :lanes="lanes"
        :ticks="ticks"
        :range-start="range.start"
        :per-day="perDay"
        :width="width"
        :flagged="flagged"
        :format-day="formatDay"
        @move="timeline.move"
        @open="open"
      />
      <TimelineIssues
        :overlaps="overlaps"
        :gaps="gaps"
        :title-of="titleOf"
        :format-day="formatDay"
      />
      <TimelineUndated
        :items="view.undated"
        :link-to="linkTo"
      />
    </template>
  </div>
</template>
