<script setup lang="ts">
import type { BookSummary } from '#shared/schemas/library'

const props = defineProps<{ book: BookSummary }>()

const format = useFormat()
const words = computed(() => `${format.number(props.book.wordCount)} words`)
const edited = computed(() => props.book.updatedAt ? format.date(props.book.updatedAt) : null)
</script>

<template>
  <NuxtLink
    :to="writeRoute(book.id)"
    class="group block rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
  >
    <UCard
      class="h-full transition-colors group-hover:bg-elevated/50"
      :ui="{ body: 'flex h-full flex-col gap-4' }"
    >
      <div class="flex aspect-[3/2] items-end rounded-md bg-gradient-to-br from-primary/25 to-elevated p-3">
        <UIcon
          name="i-lucide-book-open"
          class="size-6 text-primary"
        />
      </div>
      <div class="min-w-0 flex-1">
        <p class="truncate font-medium text-highlighted">
          {{ book.title }}
        </p>
        <p
          v-if="book.author || book.subtitle"
          class="truncate text-sm text-muted"
        >
          {{ book.subtitle ?? book.author }}
        </p>
      </div>
      <div class="flex flex-wrap gap-x-3 gap-y-1">
        <BaseStat
          icon="i-lucide-type"
          :label="words"
        />
        <BaseStat
          icon="i-lucide-file-text"
          :label="`${book.scenes} scenes`"
        />
        <BaseStat
          v-if="edited"
          icon="i-lucide-clock"
          :label="edited"
        />
      </div>
    </UCard>
  </NuxtLink>
</template>
