<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
const { book } = useBook(bookId)
useSeoMeta({ title: () => book.value?.title ?? 'Write' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
    <ManuscriptBreadcrumb
      v-if="activeEntryPath"
      :book-id="bookId"
      :path="activeEntryPath"
    />
    <BasePageHeader
      v-else
      :title="book?.title ?? ''"
      :description="book?.author ?? undefined"
    />
    <BaseEmptyState
      icon="i-lucide-feather"
      :title="activeEntryPath ? 'The editor opens here' : 'Pick a scene to start writing'"
      :description="activeEntryPath ? 'Block editor coming next.' : 'Choose a scene in the manuscript tree or create a new one.'"
    />
  </div>
</template>
