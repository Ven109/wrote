<script setup lang="ts">
const bookId = useRouteBookId()
const { activeEntryPath } = useAppNavigation()
useSeoMeta({ title: 'Codex' })
</script>

<template>
  <BaseSplitView
    :detail-active="Boolean(activeEntryPath)"
    list-label="Codex list"
  >
    <template #list>
      <CodexListPanel
        :book-id="bookId"
        :active-path="activeEntryPath"
      />
    </template>
    <NuxtPage />
  </BaseSplitView>
</template>
