<script setup lang="ts">
import { INTEGRATION_PRESETS } from '~/utils/integration-presets'

const integrations = useIntegrations()
const { form, editing, busy, open } = integrations
useSeoMeta({ title: 'Integrations' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="Integrations"
      description="Give the assistant tools from other MCP servers: web search, your reference manager and more. Settings stay in this workspace, not in your books; keys are stored on this computer only."
    />
    <section
      aria-labelledby="add-integration-heading"
      class="flex flex-col gap-2"
    >
      <h2
        id="add-integration-heading"
        class="text-sm font-medium text-muted"
      >
        Add an integration
      </h2>
      <div class="grid gap-2 sm:grid-cols-3">
        <button
          v-for="preset in INTEGRATION_PRESETS"
          :key="preset.label"
          type="button"
          class="flex min-h-11 flex-col items-start gap-1 rounded-lg p-3 text-start ring ring-default hover:bg-elevated"
          @click="integrations.create(preset.form)"
        >
          <span class="font-medium text-highlighted">{{ preset.label }}</span>
          <span class="text-xs text-muted">{{ preset.description }}</span>
        </button>
      </div>
    </section>
    <USkeleton
      v-if="integrations.loading.value"
      class="h-32 w-full"
    />
    <div
      v-else-if="integrations.integrations.value.length"
      class="flex flex-col gap-3"
    >
      <SettingsIntegrationCard
        v-for="integration in integrations.integrations.value"
        :key="integration.id"
        :integration="integration"
        :busy="busy === integration.id"
        @edit="integrations.edit(integration)"
        @remove="integrations.remove(integration)"
        @reconnect="integrations.reconnect(integration)"
        @toggle="(tool, enabled) => integrations.toggleTool(integration, tool, enabled)"
      />
    </div>
    <BaseEmptyState
      v-else
      icon="i-lucide-blocks"
      title="No integrations yet"
      description="Pick a suggestion above or connect any MCP server."
    />
    <SettingsIntegrationForm
      v-if="form"
      v-model:open="open"
      v-model:form="form"
      :editing="Boolean(editing)"
      :saving="busy === 'form'"
      @save="integrations.save"
    />
  </div>
</template>
