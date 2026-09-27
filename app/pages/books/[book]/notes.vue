<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
useSeoMeta({ title: 'Notes' })
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside
      class="w-full flex-col overflow-y-auto p-4 lg:flex lg:w-80 lg:shrink-0 lg:border-e lg:border-default"
      :class="activeEntryPath ? 'hidden' : 'flex'"
    >
      <NotesListPanel
        :book-id="bookId"
        :active-path="activeEntryPath"
      />
    </aside>
    <div
      class="min-w-0 flex-1 overflow-y-auto lg:block"
      :class="activeEntryPath ? 'block' : 'hidden'"
    >
      <NuxtPage />
    </div>
  </div>
</template>
