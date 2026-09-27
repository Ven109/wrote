<script setup lang="ts">
import type { ToolPolicy, ToolPolicyPatch } from '#shared/schemas/permissions'

defineProps<{ policy: ToolPolicy, who: string }>()
defineEmits<{ update: [patch: ToolPolicyPatch] }>()

const ALLOW = { label: 'Allow', value: 'allow' }
const ASK = { label: 'Ask me', value: 'ask' }
const DENY = { label: 'Don\'t allow', value: 'deny' }
const LEVELS = [
  { key: 'read', label: 'Read the book', hint: 'Search, read entries, codex, structure', items: [ALLOW, DENY] },
  { key: 'propose', label: 'Propose changes', hint: 'Suggestions you accept or reject', items: [ALLOW, DENY] },
  { key: 'write', label: 'Write', hint: 'Create notes and other direct changes', items: [ALLOW, ASK, DENY] },
  { key: 'destructive', label: 'Delete or overwrite', hint: 'Always needs your approval', items: [ASK, DENY] },
] as const
</script>

<template>
  <dl class="grid gap-3 sm:grid-cols-2">
    <div
      v-for="level in LEVELS"
      :key="level.key"
      class="flex flex-col gap-1"
    >
      <dt class="text-sm font-medium">
        {{ level.label }}
        <span class="block text-xs font-normal text-muted">{{ level.hint }}</span>
      </dt>
      <dd>
        <USelect
          :model-value="policy[level.key]"
          :items="[...level.items]"
          :aria-label="`${who}: ${level.label}`"
          class="w-full"
          @update:model-value="$emit('update', { [level.key]: $event })"
        />
      </dd>
    </div>
  </dl>
</template>
