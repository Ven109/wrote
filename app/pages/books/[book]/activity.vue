<script setup lang="ts">
const bookId = useRouteBookId()
const { filters, entries, tools, isPending, error, expanded, undoing, conflict, toggle, undo, forceUndo, dismissConflict } = useActivity(bookId)
const conflictOpen = computed({ get: () => conflict.value !== null, set: open => !open && dismissConflict() })
useSeoMeta({ title: 'Activity' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 sm:p-6">
    <BasePageHeader
      title="Activity"
      description="Everything the assistant and connected agents changed in this book. Review any change and undo it."
    />
    <ActivityFilters
      v-model="filters"
      :tools="tools"
    />
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      title="Could not load the activity log"
      :description="apiErrorMessage(error)"
    />
    <p
      v-else-if="isPending"
      class="text-sm text-muted"
    >
      Loading…
    </p>
    <BaseEmptyState
      v-else-if="!entries.length"
      icon="i-lucide-history"
      title="No activity yet"
      description="When the assistant or an MCP agent changes something, it shows up here."
    />
    <ul
      v-else
      class="flex flex-col gap-2"
      aria-label="Activity log"
    >
      <ActivityEntryCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :expanded="expanded === entry.id"
        :busy="undoing === entry.id"
        @toggle="toggle(entry.id)"
        @undo="undo(entry)"
      />
    </ul>
    <BaseConfirmModal
      v-model:open="conflictOpen"
      title="Undo anyway?"
      :description="conflict?.message"
      confirm-label="Undo and discard edits"
      danger
      @confirm="forceUndo"
    />
  </div>
</template>
