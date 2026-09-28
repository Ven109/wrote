<script setup lang="ts">
defineProps<{ collapsed?: boolean }>()

const { settingsItems, settingsActive } = useAppNavigation()
</script>

<template>
  <UDropdownMenu
    :items="settingsItems"
    :content="{ side: collapsed ? 'right' : 'top', align: 'start' }"
    :ui="{ content: 'min-w-56' }"
  >
    <UTooltip
      text="App settings"
      :content="{ side: collapsed ? 'right' : 'top' }"
    >
      <UButton
        icon="i-lucide-settings"
        color="neutral"
        :variant="settingsActive ? 'soft' : 'ghost'"
        aria-label="App settings"
        class="size-11 justify-center"
      />
    </UTooltip>
  </UDropdownMenu>
</template>
