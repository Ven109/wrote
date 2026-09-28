<script setup lang="ts">
/** Main content area of the shell; `bare` drops the inset frame (distraction-free mode). */
const { bare = false } = defineProps<{ bare?: boolean }>()
</script>

<template>
  <main
    class="flex min-h-svh min-w-0 flex-1 flex-col bg-default pb-[env(safe-area-inset-bottom)]"
    :class="bare ? 'lg:h-svh lg:overflow-hidden' : 'lg:my-2 lg:me-2 lg:min-h-[calc(100svh-1rem)] lg:overflow-hidden lg:rounded-xl lg:shadow-xs lg:ring lg:ring-default'"
  >
    <slot />
  </main>
</template>
