<script setup lang="ts">
const { open, searchTerm, groups } = useCommandPalette()
const { toggleSidebar, toggleAssistant } = useAppLayout()
const { bookId } = useAppNavigation()
useBookSearch(bookId)

defineShortcuts({
  meta_k: () => {
    open.value = !open.value
  },
  meta_b: toggleSidebar,
  meta_j: toggleAssistant,
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Search and commands"
    description="Jump anywhere or run a command"
    :ui="{ content: 'sm:max-w-xl' }"
  >
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="groups"
        placeholder="Search or type a command…"
        close
        class="h-96"
        @update:open="open = $event"
      />
    </template>
  </UModal>
</template>
