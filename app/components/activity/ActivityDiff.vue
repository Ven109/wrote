<script setup lang="ts">
import type { FileChange } from '#shared/schemas/activity'
import { diffHunks, diffLines } from '#shared/utils/line-diff'

const props = defineProps<{ changes: FileChange[] }>()
const files = computed(() => props.changes.map(change => ({ change, lines: diffHunks(diffLines(change.before, change.after)) })))
const LINE_CLASS = { same: 'text-muted', added: 'bg-success/10 text-success', removed: 'bg-error/10 text-error line-through decoration-error/40' }
const PREFIX = { same: ' ', added: '+', removed: '−' }
</script>

<template>
  <div class="flex flex-col gap-3">
    <figure
      v-for="{ change, lines } in files"
      :key="change.path"
      class="overflow-hidden rounded-md ring ring-default"
    >
      <figcaption class="truncate bg-elevated px-3 py-1.5 font-mono text-xs text-toned">
        {{ changeLabel(change) }}
      </figcaption>
      <pre class="max-h-80 overflow-auto p-2 text-xs leading-5 whitespace-pre-wrap"><template
        v-for="(line, index) in lines"
        :key="index"
      ><span
        v-if="line"
        :class="['block px-1', LINE_CLASS[line.kind]]"
      ><span
        class="me-2 select-none"
        aria-hidden="true"
      >{{ PREFIX[line.kind] }}</span><span class="sr-only">{{ line.kind === 'same' ? '' : `${line.kind}: ` }}</span>{{ line.text }}</span><span
        v-else
        class="block px-1 text-dimmed select-none"
      >⋯</span></template></pre>
    </figure>
  </div>
</template>
