<script setup lang="ts">
const props = defineProps<{ bookId: string, activePath: string | null }>()
const codex = useCodex(() => props.bookId)
const { type, tag, search, view, entries, status, types, typeOf, tags, creating, creatingType, newItems } = codex
const typeItems = computed(() => [{ label: 'All types', value: null }, ...types.value.map(t => ({ label: t.plural, value: t.id, icon: t.icon }))])
</script>

<template>
  <section class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-lg font-semibold text-highlighted">
        Codex
      </h1>
      <div class="flex items-center gap-1">
        <CodexScanControls :book-id="bookId" />
        <UButton
          :icon="view === 'grid' ? 'i-lucide-list' : 'i-lucide-layout-grid'"
          :aria-label="view === 'grid' ? 'Show as list' : 'Show as grid'"
          color="neutral"
          variant="ghost"
          class="size-11 justify-center lg:size-auto"
          @click="view = view === 'grid' ? 'list' : 'grid'"
        />
        <UDropdownMenu :items="newItems">
          <UButton
            icon="i-lucide-plus"
            label="New"
            size="sm"
            class="min-h-11 sm:min-h-0"
          />
        </UDropdownMenu>
      </div>
    </div>
    <UInput
      v-model="search"
      icon="i-lucide-search"
      placeholder="Search names, aliases, text"
      aria-label="Search codex"
    />
    <div class="grid grid-cols-2 gap-2">
      <USelect
        v-model="type"
        :items="typeItems"
        aria-label="Filter by type"
        size="sm"
      />
      <USelect
        v-model="tag"
        :items="[{ label: 'All tags', value: null }, ...tags.map(t => ({ label: t, value: t }))]"
        aria-label="Filter by tag"
        size="sm"
        :disabled="!tags.length"
      />
    </div>
    <nav
      v-if="entries.length"
      aria-label="Codex entries"
      :class="view === 'grid' ? 'grid grid-cols-2 gap-2' : 'flex flex-col gap-0.5'"
    >
      <CodexEntryCard
        v-for="entry in entries"
        :key="entry.id"
        :entry="entry"
        :to="`/books/${bookId}/codex/${entry.path}`"
        :icon="typeOf(entry.codexType)?.icon ?? 'i-lucide-book-open'"
        :type-label="typeOf(entry.codexType)?.label ?? entry.codexType"
        :active="entry.path === activePath"
        :grid="view === 'grid'"
      />
    </nav>
    <BaseEmptyState
      v-else-if="status !== 'pending'"
      icon="i-lucide-book-user"
      title="No entries"
      description="Add characters, places and lore with “New”."
    />
    <BasePromptModal
      v-model:open="creating"
      :title="`New ${typeOf(creatingType ?? undefined)?.label.toLowerCase() ?? 'entry'}`"
      label="Name"
      submit-label="Create"
      @submit="codex.submitNew"
    />
  </section>
</template>
