<script setup lang="ts">
import type { Backlink } from '#shared/schemas/links'

defineProps<{ backlinks: (Backlink & { href: string })[] }>()
</script>

<template>
  <section
    aria-labelledby="backlinks-heading"
    class="border-t border-default pt-4"
  >
    <h2
      id="backlinks-heading"
      class="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted"
    >
      <UIcon
        name="i-lucide-link"
        class="size-4"
      />
      Linked from {{ backlinks.length }} {{ backlinks.length === 1 ? 'entry' : 'entries' }}
    </h2>
    <ul
      v-if="backlinks.length"
      class="flex flex-col gap-1"
    >
      <li
        v-for="link in backlinks"
        :key="link.id"
      >
        <NuxtLink
          :to="link.href"
          class="flex min-h-11 flex-col justify-center rounded-md px-3 py-2 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span class="text-sm font-medium text-highlighted">{{ link.title }}</span>
          <span
            v-if="link.context"
            class="line-clamp-2 text-xs text-muted"
          >{{ link.context }}</span>
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else
      class="text-sm text-dimmed"
    >
      No entry links here yet. Type <kbd>[[</kbd> in another entry to link it.
    </p>
  </section>
</template>
