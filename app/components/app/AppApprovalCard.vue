<script setup lang="ts">
import type { PendingApproval } from '#shared/schemas/permissions'

defineProps<{ approval: PendingApproval, busy: boolean }>()
defineEmits<{ approve: [], deny: [] }>()
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="text-sm">
      <span class="font-medium text-highlighted">{{ approval.caller.name }}</span>
      wants to <span class="font-medium">{{ approval.toolTitle.toLowerCase() }}</span>.
    </p>
    <pre class="max-h-40 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">{{ JSON.stringify(approval.input, null, 2) }}</pre>
    <div class="flex gap-2">
      <UButton
        label="Allow"
        icon="i-lucide-check"
        :loading="busy"
        class="min-h-11"
        :color="approval.permission === 'destructive' ? 'error' : 'primary'"
        @click="$emit('approve')"
      />
      <UButton
        label="Deny"
        icon="i-lucide-x"
        color="neutral"
        variant="soft"
        class="min-h-11"
        :disabled="busy"
        @click="$emit('deny')"
      />
    </div>
  </div>
</template>
