<script setup lang="ts">
useSeoMeta({ title: 'Library' })

const { books, status } = useBooks()
const newBookOpen = ref(false)
const openFolderOpen = ref(false)
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
    <BasePageHeader
      title="Library"
      description="Your books. Each book is a folder of Markdown files."
    >
      <template #actions>
        <UButton
          icon="i-lucide-folder-open"
          label="Open folder"
          color="neutral"
          variant="outline"
          @click="openFolderOpen = true"
        />
        <UButton
          icon="i-lucide-plus"
          label="New book"
          @click="newBookOpen = true"
        />
      </template>
    </BasePageHeader>

    <div
      v-if="status === 'pending' && !books.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <USkeleton
        v-for="n in 4"
        :key="n"
        class="h-64"
      />
    </div>

    <div
      v-else-if="books.length"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <LibraryBookCard
        v-for="book in books"
        :key="book.id"
        :book="book"
      />
    </div>

    <BaseEmptyState
      v-else
      icon="i-lucide-book-open"
      title="No books yet"
      description="Create your first book or open an existing folder of Markdown files."
    >
      <UButton
        icon="i-lucide-plus"
        label="New book"
        @click="newBookOpen = true"
      />
    </BaseEmptyState>

    <LibraryNewBookModal v-model:open="newBookOpen" />
    <LibraryOpenFolderModal v-model:open="openFolderOpen" />
  </div>
</template>
