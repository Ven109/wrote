<script setup lang="ts">
import type { IntegrationView } from '#shared/schemas/integrations'

/** One external MCP server: status, sign-in, tools with on/off switches, actions. */
const props = defineProps<{ integration: IntegrationView, busy: boolean }>()
defineEmits<{ edit: [], remove: [], reconnect: [], toggle: [tool: string, enabled: boolean] }>()
const STATE = {
  'connected': { label: 'Connected', color: 'success' },
  'connecting': { label: 'Connecting…', color: 'primary' },
  'needs-auth': { label: 'Sign-in needed', color: 'warning' },
  'error': { label: 'Error', color: 'error' },
  'disconnected': { label: 'Not connected', color: 'neutral' },
} as const
const POLICY = { allow: 'Runs tools without asking', ask: 'Asks before each tool call', deny: 'Tools not offered' } as const
const where = computed(() => (props.integration.transport === 'http' ? props.integration.url : [props.integration.command, ...props.integration.args].join(' ')))
</script>

<template>
  <article
    class="flex flex-col gap-3 rounded-lg p-4 ring ring-default"
    :aria-label="integration.name"
  >
    <header class="flex flex-wrap items-center gap-2">
      <h2 class="font-medium text-highlighted">
        {{ integration.name }}
      </h2>
      <UBadge
        :label="integration.enabled ? STATE[integration.state].label : 'Off'"
        :color="integration.enabled ? STATE[integration.state].color : 'neutral'"
        variant="subtle"
        size="sm"
      />
      <span class="text-xs text-muted">{{ POLICY[integration.policy] }}</span>
    </header>
    <p class="truncate font-mono text-xs text-muted">
      {{ where }}
    </p>
    <p
      v-if="integration.error"
      class="text-sm text-error"
    >
      {{ integration.error }}
    </p>
    <UButton
      v-if="integration.state === 'needs-auth' && integration.authUrl"
      :to="integration.authUrl"
      target="_blank"
      external
      label="Sign in"
      icon="i-lucide-log-in"
      class="min-h-11 self-start lg:min-h-0"
    />
    <ul
      v-if="integration.tools.length"
      class="flex flex-col gap-1"
      :aria-label="`Tools of ${integration.name}`"
    >
      <li
        v-for="tool in integration.tools"
        :key="tool.name"
        class="flex items-start gap-3 py-1"
      >
        <USwitch
          :model-value="tool.enabled"
          :aria-label="`${tool.title} available to the assistant`"
          :disabled="busy"
          @update:model-value="(value: boolean) => $emit('toggle', tool.name, value)"
        />
        <div class="min-w-0">
          <p class="text-sm font-medium">
            {{ tool.title }}
          </p>
          <p class="line-clamp-2 text-xs text-muted">
            {{ tool.description }}
          </p>
        </div>
      </li>
    </ul>
    <div class="flex flex-wrap gap-2">
      <UButton
        label="Test connection"
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="soft"
        size="sm"
        class="min-h-11 lg:min-h-0"
        :loading="busy"
        @click="$emit('reconnect')"
      />
      <UButton
        label="Edit"
        icon="i-lucide-pencil"
        color="neutral"
        variant="ghost"
        size="sm"
        class="min-h-11 lg:min-h-0"
        @click="$emit('edit')"
      />
      <UButton
        label="Remove"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        size="sm"
        class="min-h-11 lg:min-h-0"
        :aria-label="`Remove ${integration.name}`"
        @click="$emit('remove')"
      />
    </div>
  </article>
</template>
