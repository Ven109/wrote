<script setup lang="ts">
import type { SceneBeat } from '~/queries/outline'

/** The beat(s) this scene tells, from the outline – a reminder while drafting. */
defineProps<{ beats: SceneBeat[], outlineHref: string }>()
</script>

<template>
  <aside
    v-if="beats.length"
    aria-label="Outline beat"
    class="flex flex-col gap-2 rounded-lg bg-elevated/60 p-3 text-sm"
  >
    <div
      v-for="beat in beats"
      :key="beat.id"
    >
      <p class="flex flex-wrap items-baseline gap-x-2">
        <span class="text-xs text-muted">{{ beat.actTitle }}</span>
        <span class="font-medium text-highlighted">{{ beat.title }}</span>
      </p>
      <p
        v-if="beat.summary"
        class="mt-1 line-clamp-3 text-toned"
      >
        {{ beat.summary }}
      </p>
    </div>
    <ULink
      :to="outlineHref"
      class="self-start text-xs text-primary"
    >
      Open the outline
    </ULink>
  </aside>
</template>
