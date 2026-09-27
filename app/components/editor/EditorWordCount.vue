<script setup lang="ts">
import type { LiveWordCounts } from '~/utils/word-counts'

const props = defineProps<{ counts: LiveWordCounts, sessionWords: number }>()
const format = (value: number) => new Intl.NumberFormat().format(value)
const rows = computed(() => [
  { label: 'Scene', value: format(props.counts.scene) },
  ...(props.counts.chapter === null ? [] : [{ label: 'Chapter', value: format(props.counts.chapter) }]),
  { label: 'Book', value: format(props.counts.book) },
  { label: 'This session', value: `${props.sessionWords >= 0 ? '+' : ''}${format(props.sessionWords)}` },
])
</script>

<template>
  <UPopover>
    <UButton
      :label="`${format(counts.scene)} words`"
      color="neutral"
      variant="ghost"
      size="sm"
      class="tabular-nums"
      aria-label="Word counts"
    />
    <template #content>
      <dl class="grid grid-cols-[auto_auto] gap-x-6 gap-y-1 p-3 text-sm">
        <template
          v-for="row in rows"
          :key="row.label"
        >
          <dt class="text-muted">
            {{ row.label }}
          </dt>
          <dd class="text-end tabular-nums">
            {{ row.value }}
          </dd>
        </template>
      </dl>
    </template>
  </UPopover>
</template>
