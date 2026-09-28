<script setup lang="ts">
import type { IntegrationForm } from '~/composables/useIntegrations'

/** Add or edit an external MCP server. Secret values are write-only: empty keeps the stored value. */
defineProps<{ editing: boolean, saving: boolean }>()
const open = defineModel<boolean>('open', { default: false })
const form = defineModel<IntegrationForm>('form', { required: true })
defineEmits<{ save: [] }>()
const TRANSPORTS = [{ label: 'Local command (stdio)', value: 'stdio' }, { label: 'Remote URL (HTTP)', value: 'http' }]
const POLICIES = [
  { label: 'Ask each time', value: 'ask', description: 'The assistant waits for your approval before each call' },
  { label: 'Always allow', value: 'allow', description: 'For read-only tools you trust, like web search' },
  { label: 'Off', value: 'deny', description: 'Keep the server but offer none of its tools' },
]
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="editing ? `Edit ${form.name}` : 'Add integration'"
    description="Connect an MCP server so the assistant can use its tools."
  >
    <template #body>
      <form
        id="integration-form"
        class="flex flex-col gap-4"
        @submit.prevent="$emit('save')"
      >
        <UFormField
          label="Name"
          required
        >
          <UInput
            v-model="form.name"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Id"
          help="Tools appear to the assistant as <id>__<tool>."
        >
          <UInput
            v-model="form.id"
            class="w-full"
            :disabled="editing"
          />
        </UFormField>
        <URadioGroup
          v-model="form.transport"
          :items="TRANSPORTS"
          legend="Connection"
          :disabled="editing"
        />
        <UFormField
          v-if="form.transport === 'http'"
          label="URL"
          required
        >
          <UInput
            v-model="form.url"
            type="url"
            class="w-full"
          />
        </UFormField>
        <template v-else>
          <UFormField
            label="Command"
            required
          >
            <UInput
              v-model="form.command"
              class="w-full font-mono"
              placeholder="npx"
            />
          </UFormField>
          <UFormField
            label="Arguments"
            help="One per line."
          >
            <UTextarea
              v-model="form.argsText"
              class="w-full font-mono"
              :rows="3"
              autoresize
            />
          </UFormField>
        </template>
        <fieldset class="flex flex-col gap-2">
          <legend class="mb-1 text-sm font-medium">
            {{ form.transport === 'http' ? 'Headers' : 'Environment variables' }} (secret)
          </legend>
          <div
            v-for="(row, index) in form.secrets"
            :key="index"
            class="flex gap-2"
          >
            <UInput
              v-model="row.key"
              placeholder="Name"
              aria-label="Name"
              class="w-2/5 font-mono"
            />
            <UInput
              v-model="row.value"
              type="password"
              :placeholder="editing ? 'Saved – type to replace' : 'Value'"
              aria-label="Value"
              class="flex-1"
            />
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              :aria-label="`Remove ${row.key || 'row'}`"
              class="size-11 justify-center lg:size-auto"
              @click="form.secrets.splice(index, 1)"
            />
          </div>
          <UButton
            label="Add"
            icon="i-lucide-plus"
            color="neutral"
            variant="soft"
            size="sm"
            class="min-h-11 self-start lg:min-h-0"
            @click="form.secrets.push({ key: '', value: '' })"
          />
        </fieldset>
        <URadioGroup
          v-model="form.policy"
          :items="POLICIES"
          legend="When the assistant calls a tool"
        />
        <USwitch
          v-model="form.enabled"
          label="Enabled"
        />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          class="min-h-11 lg:min-h-0"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="integration-form"
          :label="editing ? 'Save' : 'Add and connect'"
          class="min-h-11 lg:min-h-0"
          :loading="saving"
          :disabled="!form.name.trim() || !form.id"
        />
      </div>
    </template>
  </USlideover>
</template>
