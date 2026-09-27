<script setup lang="ts">
defineProps<{ scenes: { id: string, title: string, href: string, count: number }[] }>()
</script>

<template>
  <section
    aria-labelledby="appears-heading"
    class="border-t border-default pt-4"
  >
    <h2
      id="appears-heading"
      class="mb-2 flex items-center gap-1.5 text-sm font-medium text-muted"
    >
      <UIcon
        name="i-lucide-scan-text"
        class="size-4"
      />
      Appears in {{ scenes.length }} {{ scenes.length === 1 ? 'scene' : 'scenes' }}
    </h2>
    <ul
      v-if="scenes.length"
      class="flex flex-col gap-1"
    >
      <li
        v-for="scene in scenes"
        :key="scene.id"
      >
        <NuxtLink
          :to="scene.href"
          class="flex min-h-11 items-center justify-between gap-2 rounded-md px-3 py-2 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span class="truncate text-sm text-highlighted">{{ scene.title }}</span>
          <UBadge
            :label="`${scene.count}×`"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </NuxtLink>
      </li>
    </ul>
    <p
      v-else
      class="text-sm text-dimmed"
    >
      Not mentioned in any scene yet. Names and aliases are detected automatically.
    </p>
  </section>
</template>
