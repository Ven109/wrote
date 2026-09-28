<script setup lang="ts">
import type { McpClientView, ToolPolicyPatch } from '#shared/schemas/permissions'

defineProps<{ client: McpClientView }>()
defineEmits<{ policy: [patch: ToolPolicyPatch], revoke: [] }>()
const confirming = ref(false)
const date = useFormat().dateTime
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-4' }">
    <div class="flex flex-wrap items-start gap-2">
      <div class="min-w-0 flex-1">
        <h3 class="font-medium text-highlighted">
          {{ client.name }}
        </h3>
        <p class="text-xs text-muted">
          <span class="font-mono">{{ client.tokenPreview }}</span>
          · {{ client.lastUsedAt ? `last used ${date(client.lastUsedAt)}` : 'never used' }}
        </p>
      </div>
      <UButton
        v-if="!confirming"
        label="Revoke"
        :aria-label="`Revoke ${client.name}`"
        icon="i-lucide-ban"
        color="error"
        variant="ghost"
        size="sm"
        class="min-h-11"
        @click="confirming = true"
      />
      <div
        v-else
        class="flex gap-1"
      >
        <UButton
          label="Revoke now"
          :aria-label="`Confirm revoking ${client.name}`"
          color="error"
          size="sm"
          class="min-h-11"
          @click="$emit('revoke')"
        />
        <UButton
          label="Keep"
          color="neutral"
          variant="ghost"
          size="sm"
          class="min-h-11"
          @click="confirming = false"
        />
      </div>
    </div>
    <SettingsPolicyForm
      :policy="client.policy"
      :who="client.name"
      @update="$emit('policy', $event)"
    />
  </UCard>
</template>
