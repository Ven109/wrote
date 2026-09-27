<script setup lang="ts">
import type { ToolCallView } from '~/utils/tool-parts'

defineProps<{ call: ToolCallView }>()
</script>

<template>
  <UChatTool
    :text="call.label"
    :loading="call.running"
    :icon="call.failed ? 'i-lucide-circle-x' : 'i-lucide-wrench'"
  >
    <div class="flex flex-col gap-2 text-xs">
      <ul
        v-if="call.entries.length"
        class="flex flex-wrap gap-1"
      >
        <li
          v-for="entry in call.entries"
          :key="entry.href"
        >
          <UButton
            :to="entry.href"
            :label="entry.title"
            icon="i-lucide-file-text"
            color="neutral"
            variant="soft"
            size="xs"
          />
        </li>
      </ul>
      <p
        v-if="call.error"
        class="text-error"
      >
        {{ call.error }}
      </p>
      <details>
        <summary class="cursor-pointer text-muted">
          Details
        </summary>
        <pre class="mt-1 max-h-48 overflow-auto rounded bg-muted p-2 whitespace-pre-wrap">{{ JSON.stringify({ input: call.input, output: call.output }, null, 2) }}</pre>
      </details>
    </div>
  </UChatTool>
</template>
