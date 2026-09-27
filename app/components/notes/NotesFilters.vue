<script setup lang="ts">
import type { NoteCounts, NoteFilter } from '#shared/schemas/notes'

const props = defineProps<{ counts?: NoteCounts }>()
const filter = defineModel<NoteFilter>('filter', { required: true })
const tag = defineModel<string | null>('tag', { required: true })
const search = defineModel<string>('search', { required: true })

const tabs = computed(() => [
  { label: 'All', value: 'all', badge: props.counts?.all },
  { label: 'Inbox', value: 'inbox', badge: props.counts?.inbox },
  { label: 'Pinned', value: 'pinned', badge: props.counts?.pinned },
  { label: 'Recent', value: 'recent' },
])
const tagItems = computed(() => [
  { label: 'All tags', value: null },
  ...(props.counts?.tags ?? []).map(entry => ({ label: `${entry.tag} (${entry.count})`, value: entry.tag })),
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search notes"
      aria-label="Search notes"
      class="w-full"
    />
    <UTabs
      v-model="filter"
      :items="tabs"
      :content="false"
      size="xs"
      class="w-full"
    />
    <USelect
      v-if="tagItems.length > 1"
      v-model="tag"
      :items="tagItems"
      aria-label="Filter by tag"
      size="sm"
      class="w-full"
    />
  </div>
</template>
