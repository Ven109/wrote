<script setup lang="ts">
const props = defineProps<{ bookId: string, activePath: string | null }>()
const { filter, tag, search, notes, counts, status } = useNotes(() => props.bookId)
const { show: capture } = useQuickCapture()
</script>

<template>
  <section
    class="flex flex-col gap-3"
    aria-label="Notes"
  >
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-lg font-semibold text-highlighted">
        Notes
      </h1>
      <UButton
        icon="i-lucide-plus"
        label="Capture"
        size="sm"
        class="min-h-11 sm:min-h-0"
        @click="capture"
      />
    </div>
    <NotesFilters
      v-model:filter="filter"
      v-model:tag="tag"
      v-model:search="search"
      :counts="counts"
    />
    <nav
      v-if="notes.length"
      class="flex flex-col gap-0.5"
      aria-label="Note list"
    >
      <NotesListItem
        v-for="note in notes"
        :key="note.id"
        :note="note"
        :to="`/books/${bookId}/notes/${note.path}`"
        :active="note.path === activePath"
      />
    </nav>
    <BaseEmptyState
      v-else-if="status !== 'pending'"
      icon="i-lucide-sticky-note"
      title="No notes here"
      description="Capture a thought with ⌘⇧N."
    />
  </section>
</template>
