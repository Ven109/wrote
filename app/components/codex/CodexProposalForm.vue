<script setup lang="ts">
import type { ProposalDraft } from '~/utils/codex-proposals'

defineProps<{ withDescription: boolean }>()
const draft = defineModel<ProposalDraft>({ required: true })
/** Entry references (ids) are not edited here; the entry page has pickers for them. */
const isReference = (value: string | string[]) => [value].flat().some(item => /^[a-z]{3}_[a-z0-9]+$/.test(item))
</script>

<template>
  <div class="flex flex-col gap-3">
    <UFormField label="Name">
      <UInput
        v-model="draft.title"
        class="w-full"
      />
    </UFormField>
    <UFormField label="Aliases">
      <UInputTags
        v-model="draft.aliases"
        aria-label="Aliases"
        class="w-full"
      />
    </UFormField>
    <template
      v-for="(value, key) in draft.fields"
      :key="key"
    >
      <UFormField
        v-if="!isReference(value)"
        :label="String(key)"
      >
        <UInputTags
          v-if="Array.isArray(value)"
          v-model="(draft.fields[key] as string[])"
          :aria-label="String(key)"
          class="w-full"
        />
        <UInput
          v-else
          v-model="(draft.fields[key] as string)"
          :aria-label="String(key)"
          class="w-full"
        />
      </UFormField>
    </template>
    <UFormField
      v-if="withDescription"
      label="Description"
    >
      <UTextarea
        v-model="draft.description"
        autoresize
        class="w-full"
      />
    </UFormField>
  </div>
</template>
