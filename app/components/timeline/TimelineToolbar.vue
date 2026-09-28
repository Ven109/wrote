<script setup lang="ts">
import type { LaneMode } from '~/utils/timeline-layout'

const props = defineProps<{
  people: { id: string, title: string }[]
  locations: { id: string, title: string }[]
  canZoomIn: boolean
  canZoomOut: boolean
}>()
const character = defineModel<string | null>('character', { required: true })
const place = defineModel<string | null>('place', { required: true })
const laneMode = defineModel<LaneMode>('laneMode', { required: true })
defineEmits<{ zoomIn: [], zoomOut: [] }>()

const ALL = '__all'
const options = (all: string, entries: { id: string, title: string }[]) => [{ label: all, value: ALL }, ...entries.map(entry => ({ label: entry.title, value: entry.id }))]
const characterItems = computed(() => options('All characters', props.people))
const placeItems = computed(() => options('All places', props.locations))
const laneItems = [{ label: 'Lanes by chapter', value: 'chapter' }, { label: 'Lanes by character', value: 'character' }]
const characterModel = computed({ get: () => character.value ?? ALL, set: value => (character.value = value === ALL ? null : value) })
const placeModel = computed({ get: () => place.value ?? ALL, set: value => (place.value = value === ALL ? null : value) })
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <USelect
      v-model="characterModel"
      :items="characterItems"
      aria-label="Filter by character"
      class="w-full sm:w-44"
    />
    <USelect
      v-model="placeModel"
      :items="placeItems"
      aria-label="Filter by place"
      class="w-full sm:w-44"
    />
    <USelect
      v-model="laneMode"
      :items="laneItems"
      aria-label="Swimlanes"
      class="w-full sm:w-48"
    />
    <div class="ms-auto flex gap-1">
      <UButton
        icon="i-lucide-zoom-out"
        color="neutral"
        variant="ghost"
        size="lg"
        aria-label="Zoom out"
        :disabled="!canZoomOut"
        @click="$emit('zoomOut')"
      />
      <UButton
        icon="i-lucide-zoom-in"
        color="neutral"
        variant="ghost"
        size="lg"
        aria-label="Zoom in"
        :disabled="!canZoomIn"
        @click="$emit('zoomIn')"
      />
    </div>
  </div>
</template>
