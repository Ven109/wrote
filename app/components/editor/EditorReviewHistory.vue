<script setup lang="ts">
import type { ReviewRun } from '#shared/schemas/review'

/** Past review runs that covered the open scene. */
const props = defineProps<{ runs: ReviewRun[], loading: boolean, sceneId: string }>()
const summaryOf = (run: ReviewRun) => run.summaries.find(summary => summary.sceneId === props.sceneId)?.text
const open = defineModel<boolean>('open', { default: false })
const STATUS = {
  queued: { label: 'Queued', color: 'neutral' },
  running: { label: 'Running', color: 'primary' },
  done: { label: 'Done', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  cancelled: { label: 'Cancelled', color: 'neutral' },
} as const
const when = useFormat().dateTime
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Review history"
    description="Runs of review agents on this scene. Dismissed findings are not raised again."
  >
    <template #body>
      <USkeleton
        v-if="loading"
        class="h-32 w-full"
      />
      <ul
        v-else-if="runs.length"
        class="flex flex-col gap-2"
      >
        <li
          v-for="run in runs"
          :key="run.id"
          class="flex flex-col gap-1 rounded-lg p-3 text-sm ring ring-default"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium text-highlighted">{{ run.agentName }}</span>
            <UBadge
              :label="STATUS[run.status].label"
              :color="STATUS[run.status].color"
              variant="subtle"
              size="sm"
            />
          </div>
          <span class="text-muted">{{ run.targetTitle }} · {{ run.findings }} {{ run.findings === 1 ? 'finding' : 'findings' }} · {{ when(run.createdAt) }}</span>
          <p
            v-if="summaryOf(run)"
            class="italic"
          >
            {{ summaryOf(run) }}
          </p>
          <span
            v-if="run.error"
            class="text-error"
          >{{ run.error }}</span>
        </li>
      </ul>
      <BaseEmptyState
        v-else
        icon="i-lucide-scan-search"
        title="No reviews yet"
        description="Run a review agent from the Review menu."
      />
    </template>
  </USlideover>
</template>
