<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
const { book } = useBook(bookId)
const { entry, autosave, words, meta, backlinks } = useSceneEditor(bookId, activeEntryPath)
const { document, status, draft } = entry
useSeoMeta({ title: () => document.value?.title ?? book.value?.title ?? 'Write' })
defineShortcuts({ meta_s: { usingInput: true, handler: autosave.flush } })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <template v-if="activeEntryPath">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <ManuscriptBreadcrumb
          :book-id="bookId"
          :path="activeEntryPath"
          class="min-w-0"
        />
        <div class="flex shrink-0 items-center gap-1">
          <EditorSaveStatus
            :status="autosave.status.value"
            @keep-mine="autosave.keepMine"
            @use-theirs="autosave.useTheirs"
            @retry="autosave.flush"
          />
          <EditorWordCount
            :counts="words.counts.value"
            :session-words="words.sessionWords.value"
          />
          <UButton
            v-if="document?.type === 'scene'"
            icon="i-lucide-sliders-horizontal"
            color="neutral"
            variant="ghost"
            aria-label="Scene details"
            class="size-11 justify-center lg:size-auto"
            @click="meta.show"
          />
          <EditorModeToggle class="hidden sm:flex" />
        </div>
      </div>
      <template v-if="document">
        <EditorWroteEditor
          :key="document.path"
          v-model="draft"
        />
        <EditorBacklinks :backlinks="backlinks" />
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
      <EditorScenePanel
        v-model:open="meta.open.value"
        v-model:form="meta.form.value"
        :saving="meta.saving.value"
        @save="meta.save"
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
