<script setup lang="ts">
import type { SnapshotFileDiff, SnapshotSummary } from '#shared/schemas/snapshot'
import type { BlockChange } from '#shared/utils/block-diff'
import type { DiffMode } from '~/composables/useSnapshotDiff'

defineProps<{ snapshot: SnapshotSummary, files: (SnapshotFileDiff & { blocks: BlockChange[] })[], loading: boolean, busy: boolean }>()
const mode = defineModel<DiffMode>('mode', { required: true })
defineEmits<{ restoreAll: [], restoreFile: [file: SnapshotFileDiff], restoreBlock: [file: SnapshotFileDiff, index: number], remove: [], back: [] }>()
const modes = [{ label: 'Side by side', value: 'side-by-side' }, { label: 'Inline', value: 'inline' }]
</script>

<template>
  <div class="flex flex-col gap-4 p-4 sm:p-6">
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        aria-label="Back to snapshots"
        class="size-11 justify-center lg:hidden"
        @click="$emit('back')"
      />
      <h2 class="min-w-0 flex-1 truncate text-lg font-semibold text-highlighted">
        {{ snapshot.name }}
      </h2>
      <UButton
        label="Restore all"
        icon="i-lucide-history"
        size="lg"
        :disabled="busy || !files.length"
        @click="$emit('restoreAll')"
      />
      <UButton
        icon="i-lucide-trash"
        color="neutral"
        variant="ghost"
        aria-label="Delete snapshot"
        class="size-11 justify-center"
        @click="$emit('remove')"
      />
    </div>
    <div class="flex items-center justify-between gap-2">
      <p class="text-sm text-muted">
        {{ loading ? 'Comparing…' : files.length ? `${files.length} of ${snapshot.fileCount} files differ from now` : 'Same as now – nothing to restore.' }}
      </p>
      <UTabs
        v-model="mode"
        :items="modes"
        :content="false"
        size="sm"
        aria-label="Diff view"
      />
    </div>
    <section
      v-for="file in files"
      :key="file.path"
      class="flex flex-col gap-2"
      :aria-label="file.path"
    >
      <div class="flex items-center justify-between gap-2">
        <h3 class="truncate font-mono text-xs text-toned">
          {{ file.path }}
        </h3>
        <UButton
          label="Restore file"
          size="xs"
          color="neutral"
          variant="outline"
          :disabled="busy"
          class="min-h-11 lg:min-h-0"
          @click="$emit('restoreFile', file)"
        />
      </div>
      <SnapshotsBlocks
        :blocks="file.blocks"
        :mode="mode"
        :busy="busy"
        @restore="$emit('restoreBlock', file, $event)"
      />
    </section>
  </div>
</template>
