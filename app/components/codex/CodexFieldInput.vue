<script setup lang="ts">
import type { CodexField } from '#shared/schemas/codex'
import type { FieldFormValue } from '~/utils/codex-fields'

defineProps<{ field: CodexField, entryOptions: { label: string, value: string }[] }>()
const model = defineModel<FieldFormValue>({ required: true })
</script>

<template>
  <UFormField
    :label="field.label"
    :hint="field.hint"
    :required="field.required"
  >
    <UTextarea
      v-if="field.kind === 'longtext'"
      v-model="(model as string)"
      :rows="2"
      :aria-label="field.label"
      autoresize
      class="w-full"
    />
    <USelect
      v-else-if="field.kind === 'select'"
      v-model="(model as string)"
      :items="field.options ?? []"
      :aria-label="field.label"
      class="w-full"
    />
    <UInputTags
      v-else-if="field.kind === 'list'"
      v-model="(model as string[])"
      :aria-label="field.label"
      class="w-full"
    />
    <USelectMenu
      v-else-if="field.kind === 'entry' || field.kind === 'entries'"
      v-model="model"
      :items="entryOptions"
      :aria-label="field.label"
      value-key="value"
      :multiple="field.kind === 'entries'"
      :placeholder="field.kind === 'entries' ? 'Choose entries' : 'Choose an entry'"
      class="w-full"
    />
    <UInput
      v-else
      v-model="(model as string)"
      :aria-label="field.label"
      class="w-full"
    />
  </UFormField>
</template>
