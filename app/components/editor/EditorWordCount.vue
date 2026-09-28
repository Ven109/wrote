<script setup lang="ts">
import { formatShare, type AiShares } from '~/utils/provenance'
import type { LiveWordCounts } from '~/utils/word-counts'

const props = defineProps<{ counts: LiveWordCounts, sessionWords: number, aiShares?: AiShares | null }>()
const format = useFormat().number
const rows = computed(() => [
  { label: 'Scene', value: format(props.counts.scene) },
  ...(props.counts.chapter === null ? [] : [{ label: 'Chapter', value: format(props.counts.chapter) }]),
  { label: 'Book', value: format(props.counts.book) },
  { label: 'This session', value: `${props.sessionWords >= 0 ? '+' : ''}${format(props.sessionWords)}` },
])
const aiRows = computed(() => (props.aiShares
  ? [
      { label: 'Scene', value: formatShare(props.aiShares.scene) },
      ...(props.aiShares.chapter === null ? [] : [{ label: 'Chapter', value: formatShare(props.aiShares.chapter) }]),
      { label: 'Book', value: formatShare(props.aiShares.book) },
    ]
  : []))
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
        <template v-if="aiRows.length">
          <dt class="col-span-2 mt-2 flex items-center gap-1 text-xs font-medium text-muted">
            <UIcon
              name="i-lucide-sparkles"
              class="size-3.5 text-primary"
            />
            AI-assisted
          </dt>
          <template
            v-for="row in aiRows"
            :key="`ai-${row.label}`"
          >
            <dt class="text-muted">
              {{ row.label }}
            </dt>
            <dd class="text-end tabular-nums">
              {{ row.value }}
            </dd>
          </template>
        </template>
      </dl>
    </template>
  </UPopover>
</template>
