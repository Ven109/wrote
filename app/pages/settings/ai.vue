<script setup lang="ts">
const ai = useAiSettings()
useSeoMeta({ title: 'AI models' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="AI models"
      description="Bring your own key or run models locally. Keys stay on this machine and are never sent to the browser."
    />
    <UAlert
      v-if="ai.settings.value && !ai.settings.value.configured"
      icon="i-lucide-sparkles"
      color="primary"
      variant="subtle"
      title="AI is off"
      description="Wrote works fully without AI. Enable a provider and choose a chat model to use the assistant."
    />
    <section
      class="flex flex-col gap-4"
      aria-labelledby="models-heading"
    >
      <h2
        id="models-heading"
        class="font-semibold text-highlighted"
      >
        Default models
      </h2>
      <SettingsAiModelField
        :model-value="ai.settings.value?.models.chat ?? null"
        label="Chat"
        description="Assistant, feedback and longer tasks."
        :items="ai.modelItems(ai.settings.value?.models.chat)"
        @update:model-value="ai.setModel('chat', $event)"
      />
      <SettingsAiModelField
        :model-value="ai.settings.value?.models.fast ?? null"
        label="Fast"
        description="Summaries and quick suggestions. Falls back to the chat model."
        :items="ai.modelItems(ai.settings.value?.models.fast)"
        @update:model-value="ai.setModel('fast', $event)"
      />
      <SettingsAiModelField
        :model-value="ai.settings.value?.models.embedding ?? null"
        label="Embeddings"
        description="Semantic search: find passages by meaning. Runs in the background after edits. A local model (e.g. Ollama nomic-embed-text) keeps it offline."
        :items="ai.embeddingItems(ai.settings.value?.models.embedding)"
        @update:model-value="ai.setModel('embedding', $event)"
      />
    </section>
    <section
      v-if="ai.settings.value"
      class="flex flex-col gap-3"
      aria-labelledby="background-heading"
    >
      <h2
        id="background-heading"
        class="font-semibold text-highlighted"
      >
        Background AI
      </h2>
      <SettingsAiSummaries
        :settings="ai.settings.value.summaries"
        @update="ai.setSummaries"
      />
    </section>
    <section
      class="flex flex-col gap-3"
      aria-labelledby="providers-heading"
    >
      <h2
        id="providers-heading"
        class="font-semibold text-highlighted"
      >
        Providers
      </h2>
      <SettingsAiProviderCard
        v-for="provider in ai.providers.value"
        :key="provider.id"
        :provider="provider"
        :test="ai.tests.value[provider.id]"
        :test-model="ai.testModelFor(provider.id)"
        @toggle="ai.toggleProvider(provider.id, $event)"
        @save-key="ai.saveKey(provider.id, $event)"
        @remove-key="ai.removeKey(provider.id)"
        @base-url="ai.setBaseUrl(provider.id, $event)"
        @test="ai.test(provider.id, ai.testModelFor(provider.id)!)"
      />
    </section>
  </div>
</template>
