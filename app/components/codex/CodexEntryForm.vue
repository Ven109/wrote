<script setup lang="ts">
import type { CodexTypeTemplate } from '#shared/schemas/codex'
import type { FieldForm } from '~/utils/codex-fields'

defineProps<{ template: CodexTypeTemplate, entryOptions: { label: string, value: string }[] }>()
const form = defineModel<FieldForm>({ required: true })
</script>

<template>
  <section
    class="grid gap-4 rounded-lg border border-default p-4 sm:grid-cols-2"
    :aria-label="`${template.label} details`"
  >
    <UFormField
      label="Also known as"
      class="sm:col-span-2"
    >
      <UInputTags
        v-model="form.aliases"
        placeholder="Add a nickname or alias…"
        aria-label="Aliases"
        class="w-full"
      />
    </UFormField>
    <CodexFieldInput
      v-for="field in template.fields"
      :key="field.key"
      v-model="form.fields[field.key]!"
      :field="field"
      :entry-options="entryOptions"
      :class="{ 'sm:col-span-2': field.kind === 'longtext' || field.kind === 'entries' || field.kind === 'list' }"
    />
  </section>
</template>
