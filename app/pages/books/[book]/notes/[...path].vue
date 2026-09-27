<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
const note = useNoteEditor(bookId, activeEntryPath)
const { document, status, draft } = note.entry
useSeoMeta({ title: () => note.title.value || 'Note' })
defineShortcuts({ meta_s: { usingInput: true, handler: note.autosave.flush } })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <template v-if="document">
      <NotesNoteHeader
        :title="note.title.value"
        :tags="note.tags.value"
        :pinned="note.pinned.value"
        :in-inbox="note.inInbox.value"
        :status="note.autosave.status.value"
        :back-to="`/books/${bookId}/notes`"
        @rename="note.rename"
        @tags="note.setTags"
        @toggle-pin="note.togglePin"
        @file="note.file"
        @keep-mine="note.autosave.keepMine"
        @use-theirs="note.autosave.useTheirs"
        @retry="note.autosave.flush"
      />
      <EditorWroteEditor
        :key="document.path"
        v-model="draft"
        placeholder="Write your note…"
      />
      <EditorBacklinks :backlinks="note.backlinks.value" />
    </template>
    <USkeleton
      v-else-if="status === 'pending'"
      class="h-64 w-full"
    />
    <BaseEmptyState
      v-else
      icon="i-lucide-file-x"
      title="This note could not be opened"
      description="It may have been moved or deleted."
    />
  </div>
</template>
