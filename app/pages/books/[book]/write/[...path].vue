<script setup lang="ts">
const bookId = useRouteBookId()
const { book } = useBook(bookId)
useSeoMeta({ title: () => book.value?.title ?? 'Write' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      :title="book?.title ?? ''"
      :description="book?.author ?? undefined"
    />
    <BaseEmptyState
      icon="i-lucide-feather"
      title="Pick a scene to start writing"
      description="The manuscript tree and editor appear here."
    />
  </div>
</template>
