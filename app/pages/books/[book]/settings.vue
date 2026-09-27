<script setup lang="ts">
import { UpdateBookSchema } from '#shared/schemas/library'

const bookId = useRouteBookId()
const { book, update } = useBook(bookId)
const { removeBook } = useBooks()
const toast = useToast()
useSeoMeta({ title: 'Book settings' })

const state = reactive({ title: '', subtitle: '', author: '', language: 'en' })
watch(book, (value) => {
  if (!value) return
  Object.assign(state, { title: value.title, subtitle: value.subtitle ?? '', author: value.author ?? '', language: value.language })
}, { immediate: true })

const saving = ref(false)
async function save() {
  saving.value = true
  try {
    await update({ ...state, subtitle: state.subtitle || undefined, author: state.author || undefined })
    toast.add({ title: 'Settings saved', color: 'success' })
  }
  finally {
    saving.value = false
  }
}

const confirmRemove = ref(false)
async function remove() {
  await removeBook(bookId.value)
  await navigateTo('/')
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="Book settings"
      description="Stored in wrote.json in the book folder."
    />
    <UCard>
      <UForm
        :schema="UpdateBookSchema"
        :state="state"
        class="space-y-4"
        @submit="save"
      >
        <UFormField
          label="Title"
          name="title"
          required
        >
          <UInput
            v-model="state.title"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Subtitle"
          name="subtitle"
        >
          <UInput
            v-model="state.subtitle"
            class="w-full"
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
        <div class="flex justify-end">
          <UButton
            type="submit"
            label="Save"
            :loading="saving"
          />
        </div>
      </UForm>
    </UCard>

    <UCard :ui="{ root: 'ring-error/40' }">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="font-medium text-highlighted">
            Remove from workspace
          </p>
          <p class="text-sm text-muted">
            The folder is moved to the workspace trash (or just unlinked if it lives elsewhere). No files are deleted.
          </p>
        </div>
        <UButton
          color="error"
          variant="soft"
          label="Remove book"
          @click="confirmRemove = true"
        />
      </div>
    </UCard>

    <BaseConfirmModal
      v-model:open="confirmRemove"
      title="Remove this book?"
      :description="`“${book?.title}” will be removed from the library.`"
      confirm-label="Remove"
      danger
      @confirm="remove"
    />
  </div>
</template>
