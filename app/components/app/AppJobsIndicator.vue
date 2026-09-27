<script setup lang="ts">
const props = defineProps<{ bookId: string }>()
const { jobs, active, cancel } = useJobsIndicator(() => props.bookId)
const STATUS_ICONS: Record<string, string> = {
  queued: 'i-lucide-clock',
  running: 'i-lucide-loader-circle',
  succeeded: 'i-lucide-circle-check',
  failed: 'i-lucide-circle-x',
  cancelled: 'i-lucide-circle-slash',
}
</script>

<template>
  <UPopover v-if="jobs.length">
    <UButton
      :icon="active.length ? 'i-lucide-loader-circle' : 'i-lucide-list-checks'"
      :label="active.length ? String(active.length) : undefined"
      color="neutral"
      variant="ghost"
      :aria-label="active.length ? `${active.length} background jobs running` : 'Background jobs'"
      class="min-h-11 justify-center lg:min-h-0"
      :ui="{ leadingIcon: active.length ? 'animate-spin motion-reduce:animate-none' : '' }"
    />
    <template #content>
      <ul
        class="flex max-h-96 w-80 max-w-[calc(100vw-2rem)] flex-col gap-3 overflow-y-auto p-3"
        aria-label="Background jobs"
      >
        <li
          v-for="job in jobs"
          :key="job.id"
          class="flex flex-col gap-1.5"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="STATUS_ICONS[job.status]!"
              class="size-4 shrink-0"
              :class="{ 'animate-spin motion-reduce:animate-none': job.status === 'running', 'text-error': job.status === 'failed', 'text-success': job.status === 'succeeded' }"
            />
            <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ job.title }}</span>
            <UButton
              v-if="job.status === 'queued' || job.status === 'running'"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              :aria-label="`Cancel ${job.title}`"
              class="size-11 justify-center lg:size-auto"
              @click="cancel(job.id)"
            />
          </div>
          <UProgress
            v-if="job.status === 'running'"
            :model-value="Math.round(job.progress * 100)"
            size="xs"
          />
          <span
            v-if="job.message || job.error"
            class="truncate text-xs"
            :class="job.error ? 'text-error' : 'text-muted'"
          >{{ job.error ?? job.message }}</span>
        </li>
      </ul>
    </template>
  </UPopover>
</template>
