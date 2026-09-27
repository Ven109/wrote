<script setup lang="ts">
import type { McpClientConfig } from '~/utils/mcp-configs'

defineProps<{ name: string, token: string, configs: McpClientConfig[] }>()
defineEmits<{ copy: [text: string], done: [] }>()
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-4' }">
    <UAlert
      icon="i-lucide-key-round"
      color="primary"
      variant="subtle"
      :title="`Token for ${name}`"
      description="Copy it now – it is shown only once. Anyone with it can use your books within this agent's permissions."
    />
    <div class="flex gap-2">
      <UInput
        :model-value="token"
        readonly
        aria-label="MCP token"
        class="min-w-0 flex-1 font-mono"
      />
      <UButton
        icon="i-lucide-copy"
        aria-label="Copy token"
        color="neutral"
        variant="outline"
        class="min-h-11"
        @click="$emit('copy', token)"
      />
    </div>
    <SettingsCodeSnippet
      v-for="config in configs"
      :key="config.id"
      :label="config.label"
      :hint="config.hint"
      :code="config.snippet"
      @copy="$emit('copy', config.snippet)"
    />
    <UButton
      label="Done"
      class="min-h-11 self-end"
      @click="$emit('done')"
    />
  </UCard>
</template>
