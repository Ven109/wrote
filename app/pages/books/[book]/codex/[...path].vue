<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
const codex = useCodexEntry(bookId, activeEntryPath)
const { document, status, draft } = codex.entry
const { options: entryOptions } = useCodexEntryOptions(bookId, () => document.value?.id)
const title = ref('')
watch(() => document.value?.title, (value) => {
  title.value = value ?? ''
}, { immediate: true })
useSeoMeta({ title: () => document.value?.title ?? 'Codex' })
defineShortcuts({ meta_s: { usingInput: true, handler: codex.autosave.flush } })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <template v-if="document">
      <header class="flex items-center gap-1">
        <UButton
          :to="`/books/${bookId}/codex`"
          icon="i-lucide-arrow-left"
          color="neutral"
          variant="ghost"
          aria-label="Back to codex"
          class="size-11 justify-center lg:hidden"
        />
        <UIcon
          :name="codex.template.value?.icon ?? 'i-lucide-book-open'"
          class="size-5 shrink-0 text-muted"
        />
        <UInput
          v-model="title"
          variant="ghost"
          size="xl"
          aria-label="Entry name"
          class="min-w-0 flex-1"
          :ui="{ base: 'text-xl font-semibold px-1' }"
          @blur="codex.rename(title)"
          @keydown.enter.prevent="codex.rename(title)"
        />
        <UBadge
          :label="codex.template.value?.label ?? String(document.frontmatter.codexType)"
          color="neutral"
          variant="subtle"
        />
        <EditorSaveStatus
          :status="codex.autosave.status.value"
          @keep-mine="codex.autosave.keepMine"
          @use-theirs="codex.autosave.useTheirs"
          @retry="codex.autosave.flush"
        />
      </header>
      <CodexEntryForm
        v-if="codex.template.value"
        v-model="codex.fields.form.value"
        :template="codex.template.value"
        :entry-options="entryOptions"
      />
      <EditorWroteEditor
        :key="document.path"
        v-model="draft"
        placeholder="Describe this entry…"
      />
      <EditorBacklinks :backlinks="codex.backlinks.value" />
    </template>
    <USkeleton
      v-else-if="status === 'pending'"
      class="h-64 w-full"
    />
    <BaseEmptyState
      v-else
      icon="i-lucide-file-x"
      title="This entry could not be opened"
      description="It may have been moved or deleted."
    />
  </div>
</template>
