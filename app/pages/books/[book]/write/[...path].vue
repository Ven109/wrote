<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
const { book } = useBook(bookId)
const { document, status, draft, dirty, saving, save } = useEntryDocument(bookId, activeEntryPath)
useSeoMeta({ title: () => document.value?.title ?? book.value?.title ?? 'Write' })
defineShortcuts({ meta_s: { usingInput: true, handler: save } })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <template v-if="activeEntryPath">
      <div class="flex items-center justify-between gap-2">
        <ManuscriptBreadcrumb
          :book-id="bookId"
          :path="activeEntryPath"
          class="min-w-0"
        />
        <div class="flex shrink-0 items-center gap-1">
          <UBadge
            v-if="dirty || saving"
            :label="saving ? 'Saving…' : 'Unsaved'"
            color="neutral"
            variant="subtle"
            size="sm"
          />
          <EditorModeToggle class="hidden sm:flex" />
        </div>
      </div>
      <EditorWroteEditor
        v-if="document"
        :key="document.path"
        v-model="draft"
      />
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
    </template>
    <template v-else>
      <BasePageHeader
        :title="book?.title ?? ''"
        :description="book?.author ?? undefined"
      />
      <BaseEmptyState
        icon="i-lucide-feather"
        title="Pick a scene to start writing"
        description="Choose a scene in the manuscript tree or create a new one."
      />
    </template>
  </div>
</template>
