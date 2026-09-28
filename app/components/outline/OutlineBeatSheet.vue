<script setup lang="ts">
/** Edits a beat's title and summary. */
const draft = defineModel<{ title: string, summary: string } | null>({ required: true })
defineEmits<{ save: [] }>()
const open = computed({ get: () => draft.value !== null, set: value => !value && (draft.value = null) })
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Beat"
  >
    <template #body>
      <form
        v-if="draft"
        class="flex flex-col gap-4"
        @submit.prevent="$emit('save')"
      >
        <UFormField label="Title">
          <UInput
            v-model="draft.title"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Summary">
          <UTextarea
            v-model="draft.summary"
            :rows="8"
            autoresize
            class="w-full"
          />
        </UFormField>
        <UButton
          type="submit"
          label="Save"
          class="self-end"
          :disabled="!draft.title.trim()"
        />
      </form>
    </template>
  </USlideover>
</template>
