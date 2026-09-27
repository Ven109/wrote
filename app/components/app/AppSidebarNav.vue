<script setup lang="ts">
defineProps<{ collapsed?: boolean }>()

const { items } = useAppNavigation()
</script>

<template>
  <UNavigationMenu
    :items="items"
    :collapsed="collapsed"
    orientation="vertical"
    tooltip
    highlight
  />
</template>
