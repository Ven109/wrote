<script setup lang="ts">
import type { SnapshotSummary } from '#shared/schemas/snapshot'

defineProps<{ snapshots: SnapshotSummary[], selectedId: string | null }>()
defineEmits<{ select: [id: string], take: [] }>()
const format = useFormat()
const when = format.dateTime
</script>

<template>
  <div class="flex flex-col gap-3">
    <UButton
      icon="i-lucide-camera"
      label="Take snapshot"
      size="lg"
      block
      @click="$emit('take')"
    />
    <p
      v-if="!snapshots.length"
      class="text-sm text-muted"
    >
      No snapshots yet. Take one before a big revision – Wrote also takes one automatically before AI bulk changes.
    </p>
    <ul
      v-else
      class="flex flex-col gap-1"
      aria-label="Snapshots"
    >
      <li
        v-for="snapshot in snapshots"
        :key="snapshot.id"
      >
        <button
          type="button"
          class="flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
          :class="snapshot.id === selectedId && 'bg-elevated'"
          :aria-current="snapshot.id === selectedId || undefined"
          @click="$emit('select', snapshot.id)"
        >
          <span class="flex w-full items-center gap-2">
            <span class="truncate text-sm font-medium">{{ snapshot.name }}</span>
            <UBadge
              v-if="snapshot.auto"
              label="auto"
              color="neutral"
              variant="subtle"
              size="sm"
            />
          </span>
          <span class="text-xs text-muted">{{ when(snapshot.createdAt) }} · {{ snapshot.scope.title }} · {{ format.number(snapshot.words) }} words</span>
        </button>
      </li>
    </ul>
  </div>
</template>
