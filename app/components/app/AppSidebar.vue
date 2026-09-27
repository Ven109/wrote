<script setup lang="ts">
const open = defineModel<boolean>('open', { default: true })
const { open: paletteOpen } = useCommandPalette()
const { bookId, activeEntryPath } = useAppNavigation()
</script>

<template>
  <USidebar
    v-model:open="open"
    variant="inset"
    collapsible="icon"
    rail
    title="Wrote"
  >
    <template #header="{ state }">
      <AppLogo :collapsed="state === 'collapsed'" />
    </template>

    <template #default="{ state }">
      <UButton
        icon="i-lucide-search"
        :label="state === 'collapsed' ? undefined : 'Search'"
        color="neutral"
        variant="outline"
        :square="state === 'collapsed'"
        block
        aria-label="Search and commands"
        @click="paletteOpen = true"
      >
        <template
          v-if="state !== 'collapsed'"
          #trailing
        >
          <div class="ms-auto flex gap-0.5">
            <UKbd value="meta" />
            <UKbd value="K" />
          </div>
        </template>
      </UButton>
      <AppSidebarNav :collapsed="state === 'collapsed'" />
      <ManuscriptTree
        v-if="bookId && state !== 'collapsed'"
        :book-id="bookId"
        :active-path="activeEntryPath"
      />
    </template>

    <template #footer="{ state }">
      <UColorModeButton
        :class="state === 'collapsed' ? '' : 'ms-auto'"
      />
    </template>
  </USidebar>
</template>
