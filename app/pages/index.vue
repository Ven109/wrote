<script setup lang="ts">
useSeoMeta({ title: 'Library' })
</script>

<template>
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
    <div>
      <h1 class="text-2xl font-semibold text-highlighted">
        Library
      </h1>
      <p class="text-muted">
        An AI-native workspace for writing books.
      </p>
    </div>
    <BaseEmptyState
      icon="i-lucide-book-open"
      title="No books yet"
      description="Your books will appear here."
    />
  </div>
</template>
