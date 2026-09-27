<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const { schema, state, pending, submit } = useOpenFolderForm(() => {
  open.value = false
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Open folder as book"
    description="Use an existing folder of Markdown files (e.g. a git repository). Nothing is changed except adding wrote.json if missing."
  >
    <template #body>
      <UForm
        id="open-folder-form"
        :schema="schema"
        :state="state"
        @submit="submit"
      >
        <UFormField
          label="Folder path"
          name="path"
          help="Absolute path on the machine running Wrote."
          required
        >
          <UInput
            v-model="state.path"
            autofocus
            class="w-full font-mono"
            placeholder="/Users/me/Books/my-novel"
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
          form="open-folder-form"
          label="Open"
          :loading="pending"
        />
      </div>
    </template>
  </UModal>
</template>
