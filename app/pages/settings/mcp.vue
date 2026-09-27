<script setup lang="ts">
const mcp = useMcpSettings()
const { data, configs, created, newName } = mcp
useSeoMeta({ title: 'Connect agents' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="Connect agents"
      description="Let AI agents like Claude Code, Claude Desktop or Cursor work with your books via MCP. Each agent gets its own token and permissions; manuscript changes always arrive as suggestions."
    />
    <UFormField
      v-if="data"
      label="Endpoint"
    >
      <UInput
        :model-value="data.url"
        readonly
        class="w-full font-mono"
      />
    </UFormField>

    <SettingsMcpNewToken
      v-if="created"
      :name="created.client.name"
      :token="created.token"
      :configs="configs"
      @copy="mcp.copy"
      @done="mcp.dismissToken"
    />
    <form
      v-else
      class="flex flex-col gap-2 sm:flex-row sm:items-end"
      @submit.prevent="mcp.createClient"
    >
      <UFormField
        label="Connect a new agent"
        description="A name to recognise it, e.g. “Claude Code”."
        class="flex-1"
      >
        <UInput
          v-model="newName"
          placeholder="Agent name"
          aria-label="Agent name"
          class="w-full"
        />
      </UFormField>
      <UButton
        type="submit"
        label="Create token"
        icon="i-lucide-key-round"
        :loading="mcp.creating.value"
        :disabled="!newName.trim()"
        class="min-h-11"
      />
    </form>

    <section
      class="flex flex-col gap-3"
      aria-labelledby="clients-heading"
    >
      <h2
        id="clients-heading"
        class="font-semibold text-highlighted"
      >
        Connected agents
      </h2>
      <SettingsMcpClientCard
        v-for="client in data?.clients ?? []"
        :key="client.id"
        :client="client"
        @policy="mcp.setPolicy(client.id, $event)"
        @revoke="mcp.revoke(client.id)"
      />
      <p
        v-if="data && !data.clients.length"
        class="text-sm text-muted"
      >
        No agents yet. Create a token above and paste the config into your agent.
      </p>
    </section>

    <section
      v-if="data"
      class="flex flex-col gap-3"
      aria-labelledby="assistant-heading"
    >
      <h2
        id="assistant-heading"
        class="font-semibold text-highlighted"
      >
        Assistant
      </h2>
      <UCard>
        <SettingsPolicyForm
          :policy="data.assistant"
          who="Assistant"
          @update="mcp.setAssistantPolicy"
        />
      </UCard>
    </section>
  </div>
</template>
