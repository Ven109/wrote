<script setup lang="ts">
import type { BlockChange } from '#shared/utils/block-diff'
import type { DiffMode } from '~/composables/useSnapshotDiff'

const props = defineProps<{ blocks: BlockChange[], mode: DiffMode, busy: boolean }>()
defineEmits<{ restore: [index: number] }>()
const LABEL = { added: 'Added since', removed: 'Removed since', changed: 'Changed' } as const
/** Changed blocks with one unchanged block around them; longer unchanged runs are collapsed. */
const rows = computed(() => props.blocks.flatMap((block, index) => {
  const near = props.blocks.slice(Math.max(0, index - 1), index + 2).some(b => b.kind !== 'same')
  return block.kind !== 'same' || near ? [{ block, index }] : []
}))
</script>

<template>
  <ol class="flex flex-col gap-2">
    <li
      v-for="{ block, index } in rows"
      :key="index"
      :aria-label="block.kind === 'same' ? 'Unchanged' : LABEL[block.kind]"
    >
      <p
        v-if="block.kind === 'same'"
        class="line-clamp-2 px-3 text-sm whitespace-pre-wrap text-dimmed"
      >
        {{ block.after }}
      </p>
      <div
        v-else
        class="rounded-md ring ring-default"
      >
        <div class="flex items-center justify-between gap-2 border-b border-default px-3 py-1 text-xs text-muted">
          <span>{{ LABEL[block.kind] }}</span>
          <UButton
            label="Restore"
            icon="i-lucide-undo-2"
            size="xs"
            color="neutral"
            variant="ghost"
            :disabled="busy"
            :aria-label="`Restore this block from the snapshot`"
            class="min-h-11 lg:min-h-0"
            @click="$emit('restore', index)"
          />
        </div>
        <div :class="mode === 'side-by-side' ? 'grid gap-px bg-default md:grid-cols-2' : 'flex flex-col'">
          <p
            v-if="block.before !== null"
            class="bg-error/10 px-3 py-2 text-sm whitespace-pre-wrap"
            :class="mode === 'inline' && 'line-through decoration-error/40'"
          >
            <span class="sr-only">Snapshot: </span>{{ block.before }}
          </p>
          <p
            v-else-if="mode === 'side-by-side'"
            class="bg-default px-3 py-2 text-sm text-dimmed italic"
          >
            (not in the snapshot)
          </p>
          <p
            v-if="block.after !== null"
            class="bg-success/10 px-3 py-2 text-sm whitespace-pre-wrap"
          >
            <span class="sr-only">Now: </span>{{ block.after }}
          </p>
          <p
            v-else-if="mode === 'side-by-side'"
            class="bg-default px-3 py-2 text-sm text-dimmed italic"
          >
            (removed since)
          </p>
        </div>
      </div>
    </li>
  </ol>
</template>
