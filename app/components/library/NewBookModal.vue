<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const { schema, state, pending, submit } = useCreateBookForm(() => {
  open.value = false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="New book"
    description="Start a book from a template. You can change everything later."
  >
    <template #body>
      <UForm
        id="new-book-form"
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="submit"
      >
        <UFormField
          label="Title"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            autofocus
            class="w-full"
            placeholder="The Cartographer of Hollow Bay"
          />
        </UFormField>
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="Author"
            name="author"
          >
            <UInput
              v-model="state.author"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Language"
            name="language"
          >
            <USelect
              v-model="state.language"
              :items="BOOK_LANGUAGES"
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField
          label="Template"
          name="template"
        >
          <URadioGroup
            v-model="state.template"
            :items="[...BOOK_TEMPLATES]"
            variant="card"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          label="Cancel"
          @click="open = false"
        />
        <UButton
          type="submit"
          form="new-book-form"
          label="Create book"
          :loading="pending"
        />
      </div>
    </template>
  </UModal>
</template>
