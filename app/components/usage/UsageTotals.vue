<script setup lang="ts">
import type { UsageTotals } from '#shared/schemas/usage'
import { formatCost, formatTokens } from '~/utils/usage'

const props = defineProps<{ totals: UsageTotals }>()
const tiles = computed(() => [
  { label: 'Estimated cost', value: formatCost(props.totals.cost) },
  { label: 'Input tokens', value: formatTokens(props.totals.inputTokens) },
  { label: 'Output tokens', value: formatTokens(props.totals.outputTokens) },
  { label: 'Cached input', value: formatTokens(props.totals.cachedTokens) },
])
</script>

<template>
  <div>
    <dl class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div
        v-for="tile in tiles"
        :key="tile.label"
        class="rounded-lg border border-default p-3"
      >
        <dt class="text-xs text-muted">
          {{ tile.label }}
        </dt>
        <dd class="text-lg font-semibold text-highlighted tabular-nums">
          {{ tile.value }}
        </dd>
      </div>
    </dl>
    <p
      v-if="totals.unpriced"
      class="mt-2 text-xs text-muted"
    >
      {{ totals.unpriced }} of {{ totals.calls }} calls used models without a known price and are not in the cost.
    </p>
  </div>
</template>
