<script setup lang="ts">
import type { ContextSnapshot } from '#shared/schemas/context'
import type { ContextRow } from '~/utils/context-items'

defineProps<{
  snapshot: ContextSnapshot | undefined
  groups: { layer: string, label: string, rows: ContextRow[] }[]
  omitted: ContextRow[]
  changed: boolean
}>()
const open = defineModel<boolean>('open', { required: true })
defineEmits<{ pin: [id: string], remove: [id: string], rerun: [] }>()
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Context sent"
    :description="snapshot ? `${snapshot.used.toLocaleString()} of ${snapshot.budget.toLocaleString()} tokens · ${snapshot.model}` : 'Loading…'"
  >
    <template #body>
      <div
        v-if="snapshot"
        class="flex flex-col gap-5"
      >
        <p class="text-sm text-muted">
          Exactly what went to the model with this answer. Pin items to always include them, leave items out, then answer again.
        </p>
        <section
          v-for="group in groups"
          :key="group.layer"
          :aria-label="group.label"
          class="flex flex-col gap-2"
        >
          <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">
            {{ group.label }}
          </h3>
          <ul class="flex flex-col gap-2">
            <AssistantContextRow
              v-for="row in group.rows"
              :key="row.item.id"
              :row="row"
              @pin="$emit('pin', row.item.id)"
              @remove="$emit('remove', row.item.id)"
            />
          </ul>
        </section>
        <section
          v-if="omitted.length"
          aria-label="Left out"
          class="flex flex-col gap-2"
        >
          <h3 class="text-xs font-semibold tracking-wide text-muted uppercase">
            Left out
          </h3>
          <ul class="flex flex-col gap-2">
            <AssistantContextRow
              v-for="row in omitted"
              :key="row.item.id"
              :row="row"
              @pin="$emit('pin', row.item.id)"
              @remove="$emit('remove', row.item.id)"
            />
          </ul>
        </section>
        <UCollapsible>
          <UButton
            label="Show the full prompt"
            icon="i-lucide-code"
            color="neutral"
            variant="ghost"
            size="sm"
            class="min-h-11"
          />
          <template #content>
            <pre class="mt-2 max-h-96 overflow-auto rounded-md bg-elevated p-2 text-xs whitespace-pre-wrap">{{ snapshot.system }}</pre>
          </template>
        </UCollapsible>
      </div>
      <USkeleton
        v-else
        class="h-40 w-full"
      />
    </template>
    <template #footer>
      <UButton
        label="Answer again with these changes"
        icon="i-lucide-refresh-cw"
        :disabled="!changed"
        block
        class="min-h-11"
        @click="$emit('rerun')"
      />
    </template>
  </USlideover>
</template>
