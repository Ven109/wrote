<script setup lang="ts">
import { SaveAgentSchema, type SaveAgentInput } from '#shared/schemas/review'

/** Settings and instructions of a custom review agent. */
defineProps<{ isNew: boolean, saving: boolean }>()
const draft = defineModel<SaveAgentInput>({ required: true })
defineEmits<{ save: [], remove: [] }>()
const SCOPES = [{ label: 'Scene', value: 'scene' }, { label: 'Chapter', value: 'chapter' }, { label: 'Whole book', value: 'book' }]
const MODELS = [{ label: 'Chat model', value: 'chat', description: 'Thorough' }, { label: 'Fast model', value: 'fast', description: 'Cheaper and quicker' }]
const TOOLS = [
  { label: 'Outline', value: 'outline', description: 'The beats the scene tells' },
  { label: 'Research', value: 'research', description: 'Research notes matching the scene' },
  { label: 'Heuristics', value: 'heuristics', description: 'Line-level flags (repetition, filter words, …)' },
]
</script>

<template>
  <UForm
    :schema="SaveAgentSchema"
    :state="draft"
    class="flex flex-col gap-4"
    @submit="$emit('save')"
  >
    <UFormField
      label="Name"
      name="name"
      required
    >
      <UInput
        v-model="draft.name"
        class="w-full"
        placeholder="Victorian dialogue checker"
      />
    </UFormField>
    <UFormField
      label="Id"
      name="id"
      :help="`Saved as agents/${draft.id || '…'}.md · call it in chat with @${draft.id || '…'}`"
    >
      <UInput
        v-model="draft.id"
        class="w-full"
        :disabled="!isNew"
      />
    </UFormField>
    <UFormField
      label="Description"
      name="description"
    >
      <UInput
        v-model="draft.description"
        class="w-full"
      />
    </UFormField>
    <UFormField
      label="Instructions"
      name="instructions"
      required
      help="What the agent looks for and how it reports. Findings quote the passage they are about."
    >
      <UTextarea
        v-model="draft.instructions"
        class="w-full"
        :rows="8"
        autoresize
      />
    </UFormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <UFormField
        label="Runs on"
        name="scopes"
      >
        <UCheckboxGroup
          v-model="draft.scopes"
          :items="SCOPES"
        />
      </UFormField>
      <UFormField
        label="Model"
        name="task"
      >
        <URadioGroup
          v-model="draft.task"
          :items="MODELS"
        />
      </UFormField>
    </div>
    <UFormField
      label="Extra material"
      name="tools"
    >
      <UCheckboxGroup
        v-model="draft.tools"
        :items="TOOLS"
      />
    </UFormField>
    <UFormField
      label="Categories"
      name="categories"
      help="Optional labels for its findings."
    >
      <UInputTags
        v-model="draft.categories"
        class="w-full"
      />
    </UFormField>
    <USwitch
      v-model="draft.summary"
      label="Write a short summary per scene"
    />
    <div class="flex flex-wrap gap-2">
      <UButton
        type="submit"
        label="Save"
        icon="i-lucide-save"
        class="min-h-11 lg:min-h-0"
        :loading="saving"
      />
      <UButton
        v-if="!isNew"
        label="Delete"
        icon="i-lucide-trash-2"
        color="error"
        variant="ghost"
        class="min-h-11 lg:min-h-0"
        @click="$emit('remove')"
      />
    </div>
  </UForm>
</template>
