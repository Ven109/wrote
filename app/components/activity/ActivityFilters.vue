<script setup lang="ts">
import type { ActivityFilterForm } from '~/utils/activity'

const props = defineProps<{ tools: string[] }>()
const filters = defineModel<ActivityFilterForm>({ required: true })
const toolItems = computed(() => [{ label: 'All tools', value: 'all' }, ...props.tools.map(tool => ({ label: tool, value: tool }))])
</script>

<template>
  <div class="grid gap-2 sm:grid-cols-3">
    <USelect
      v-model="filters.actor"
      :items="ACTOR_OPTIONS"
      aria-label="Filter by who"
      class="w-full"
    />
    <USelect
      v-model="filters.tool"
      :items="toolItems"
      aria-label="Filter by tool"
      class="w-full"
    />
    <USelect
      v-model="filters.range"
      :items="RANGE_OPTIONS"
      aria-label="Filter by time"
      class="w-full"
    />
  </div>
</template>
