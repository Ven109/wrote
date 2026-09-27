<script setup lang="ts">
const open = defineModel<boolean>('open', { default: true })
const { open: paletteOpen } = useCommandPalette()
const { bookId, activeEntryPath } = useAppNavigation()
const { isMobile } = useBreakpoint()

// On mobile the sidebar is a slideover: close it, or its overlay would sit on top of the palette.
function openSearch(closeSidebar: () => void) {
  if (isMobile.value) closeSidebar()
  paletteOpen.value = true
}
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

    <template #default="{ state, close }">
      <UButton
        icon="i-lucide-search"
        :label="state === 'collapsed' ? undefined : 'Search'"
        color="neutral"
        variant="outline"
        :square="state === 'collapsed'"
        block
        aria-label="Search and commands"
        @click="openSearch(close)"
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
      <!-- Client-only: the tree's node menus don't hydrate identically, which shifted useId()s page-wide. -->
      <ClientOnly v-if="bookId && state !== 'collapsed'">
        <ManuscriptTree
          :book-id="bookId"
          :active-path="activeEntryPath"
        />
        <template #fallback>
          <div
            class="flex flex-col gap-2 px-2 py-3"
            aria-hidden="true"
          >
            <USkeleton
              v-for="n in 4"
              :key="n"
              class="h-5 w-full"
            />
          </div>
        </template>
      </ClientOnly>
    </template>

    <template #footer="{ state }">
      <UColorModeButton
        :class="state === 'collapsed' ? '' : 'ms-auto'"
      />
    </template>
  </USidebar>
</template>
