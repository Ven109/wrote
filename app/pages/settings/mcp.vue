<script setup lang="ts">
const mcp = useMcpSettings()
const { data, configs, revealed, maskedToken } = mcp
useSeoMeta({ title: 'Connect agents' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="Connect agents"
      description="Let AI agents like Claude Code, Claude Desktop or Cursor read your books and add notes via MCP. Manuscript changes arrive as suggestions you review."
    />
    <UCard
      v-if="data"
      :ui="{ body: 'flex flex-col gap-3' }"
    >
      <UFormField label="Endpoint">
        <UInput
          :model-value="data.url"
          readonly
          class="w-full font-mono"
        />
      </UFormField>
      <UFormField
        label="Token"
        description="Only for agents on this computer. Anyone with the token can read your books."
      >
        <div class="flex gap-2">
          <UInput
            :model-value="maskedToken"
            readonly
            aria-label="MCP token"
            class="min-w-0 flex-1 font-mono"
          />
          <UButton
            :icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
            :aria-label="revealed ? 'Hide token' : 'Show token'"
            color="neutral"
            variant="outline"
            @click="revealed = !revealed"
          />
          <UButton
            icon="i-lucide-copy"
            aria-label="Copy token"
            color="neutral"
            variant="outline"
            @click="mcp.copy(data.token)"
          />
        </div>
      </UFormField>
    </UCard>
    <section
      class="flex flex-col gap-5"
      aria-labelledby="clients-heading"
    >
      <h2
        id="clients-heading"
        class="font-semibold text-highlighted"
      >
        Client setup
      </h2>
      <SettingsCodeSnippet
        v-for="config in configs"
        :key="config.id"
        :label="config.label"
        :hint="config.hint"
        :code="config.snippet"
        @copy="mcp.copy(config.snippet)"
      />
      <p class="text-sm text-muted">
        More details and troubleshooting: <code>docs/mcp.md</code>.
      </p>
    </section>
  </div>
</template>
