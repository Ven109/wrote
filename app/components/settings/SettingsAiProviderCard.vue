<script setup lang="ts">
import type { AiProviderView } from '#shared/schemas/ai'
import type { ConnectionTest } from '~/composables/useAiSettings'

const props = defineProps<{ provider: AiProviderView, test?: ConnectionTest | 'running', testModel: string | null }>()
const emit = defineEmits<{ toggle: [enabled: boolean], saveKey: [key: string], removeKey: [], baseUrl: [url: string], test: [] }>()
const key = ref('')
const baseUrl = ref(props.provider.baseUrl ?? '')
const showsBaseUrl = computed(() => props.provider.local || props.provider.id === 'openrouter')

function saveKey() {
  if (!key.value.trim()) return
  emit('saveKey', key.value)
  key.value = ''
}
</script>

<template>
  <UCard :ui="{ body: 'flex flex-col gap-3' }">
    <div class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="font-medium text-highlighted">
          {{ provider.label }}
        </p>
        <p class="text-xs text-muted">
          {{ provider.local ? 'Runs on your machine' : provider.hasKey ? `API key saved${provider.keySource === 'env' ? ' (environment)' : ''}` : 'Needs an API key' }}
        </p>
      </div>
      <USwitch
        :model-value="provider.enabled"
        :aria-label="`Enable ${provider.label}`"
        @update:model-value="emit('toggle', $event)"
      />
    </div>
    <template v-if="provider.enabled">
      <form
        v-if="provider.needsKey"
        class="flex gap-2"
        @submit.prevent="saveKey"
      >
        <UInput
          v-model="key"
          type="password"
          autocomplete="off"
          :placeholder="provider.hasKey ? 'Replace saved key…' : 'Paste API key'"
          :aria-label="`${provider.label} API key`"
          class="min-w-0 flex-1"
        />
        <UButton
          type="submit"
          label="Save"
          :disabled="!key.trim()"
        />
        <UButton
          v-if="provider.keySource === 'settings'"
          icon="i-lucide-trash"
          color="neutral"
          variant="ghost"
          :aria-label="`Remove ${provider.label} API key`"
          @click="emit('removeKey')"
        />
      </form>
      <UFormField
        v-if="showsBaseUrl"
        label="Base URL"
        :hint="provider.defaultBaseUrl ?? undefined"
      >
        <UInput
          v-model="baseUrl"
          :placeholder="provider.defaultBaseUrl ?? ''"
          class="w-full"
          @change="emit('baseUrl', baseUrl)"
        />
      </UFormField>
      <div class="flex flex-wrap items-center gap-2">
        <UButton
          label="Test connection"
          icon="i-lucide-plug-zap"
          color="neutral"
          variant="outline"
          size="sm"
          :loading="test === 'running'"
          :disabled="!testModel"
          class="min-h-11 sm:min-h-0"
          @click="emit('test')"
        />
        <span
          v-if="test && test !== 'running'"
          role="status"
          class="text-sm"
          :class="test.ok ? 'text-success' : 'text-error'"
        >{{ test.ok ? `Connected (${test.latencyMs} ms)` : test.message }}</span>
      </div>
    </template>
  </UCard>
</template>
