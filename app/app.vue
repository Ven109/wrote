<script setup lang="ts">
useHead({
  titleTemplate: title => (title ? `${title} · Wrote` : 'Wrote'),
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
