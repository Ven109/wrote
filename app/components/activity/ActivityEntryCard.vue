<script setup lang="ts">
import type { ActivityEntry } from '#shared/schemas/activity'

const props = defineProps<{ entry: ActivityEntry, expanded: boolean, busy: boolean }>()
defineEmits<{ toggle: [], undo: [] }>()
const format = useFormat()
const time = computed(() => format.dateTime(props.entry.createdAt))
</script>

<template>
  <li class="flex flex-col gap-2 rounded-lg p-3 ring ring-default">
    <div class="flex items-start gap-3">
      <UIcon
        :name="actorIcon(entry)"
        class="mt-0.5 size-5 shrink-0 text-muted"
      />
      <div class="min-w-0 flex-1">
        <p class="text-sm">
          <span class="font-medium text-highlighted">{{ entry.actor.name }}</span>
          · {{ entry.toolTitle }}
          <UBadge
            v-if="entry.undoneAt"
            label="Undone"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </p>
        <p class="text-xs text-muted">
          <time :datetime="entry.createdAt">{{ time }}</time>
        </p>
        <ul class="mt-1 text-xs text-toned">
          <li
            v-for="change in entry.changes"
            :key="change.path"
            class="truncate font-mono"
          >
            {{ changeLabel(change) }}
          </li>
          <li v-if="!entry.changes.length && !entry.undoOf">
            No files changed
          </li>
        </ul>
      </div>
    </div>
    <div class="flex flex-wrap gap-2">
      <UButton
        v-if="entry.changes.length"
        :label="expanded ? 'Hide changes' : 'Show changes'"
        :icon="expanded ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11"
        :aria-expanded="expanded"
        @click="$emit('toggle')"
      />
      <UButton
        v-if="entry.undoable && !entry.undoneAt"
        label="Undo"
        icon="i-lucide-undo-2"
        color="neutral"
        variant="soft"
        size="sm"
        class="min-h-11"
        :loading="busy"
        :aria-label="`Undo ${entry.toolTitle.toLowerCase()} by ${entry.actor.name}`"
        @click="$emit('undo')"
      />
    </div>
    <ActivityDiff
      v-if="expanded"
      :changes="entry.changes"
    />
  </li>
</template>
